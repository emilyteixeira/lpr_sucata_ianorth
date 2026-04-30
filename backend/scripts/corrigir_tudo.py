import pandas as pd
from sqlalchemy import create_engine, text
import os
import glob
from datetime import datetime
import warnings

# Ignora avisos
warnings.filterwarnings('ignore')

# --- CONFIGURAÇÃO ---
DB_URL = "mssql+pyodbc://sysdba:masterkey@192.168.1.82/LPR_sucata_db?driver=ODBC+Driver+17+for+SQL+Server&TrustServerCertificate=yes"
DIR_BASE = os.path.dirname(os.path.abspath(__file__))
PASTA_ARQUIVOS = os.path.join(DIR_BASE, "..", "historico_excel")

def converter_float(val):
    if pd.isna(val) or val == '' or str(val).strip() == '-': return 0.0
    if isinstance(val, (int, float)): return float(val)
    try:
        return float(str(val).replace(',', '.'))
    except:
        return 0.0

def processar_arquivos():
    print(f"\n🚀 SCRIPT DE CORREÇÃO INICIADO (ARQUIVO NOVO) 🚀")
    
    try:
        engine = create_engine(DB_URL)
        conn = engine.connect()
        print("✅ Conexão com Banco OK.")
    except Exception as e:
        print(f"❌ Erro ao conectar no banco: {e}")
        return

    arquivos = glob.glob(os.path.join(PASTA_ARQUIVOS, "*.xlsx"))
    print(f"📂 Encontrados {len(arquivos)} planilhas para processar.")

    total_tickets = 0

    for arquivo in arquivos:
        nome_arq = os.path.basename(arquivo)
        print(f"\n📄 Lendo: {nome_arq}...")

        try:
            df = pd.read_excel(arquivo, header=4)
            df.columns = df.columns.str.strip()

            if 'Ticket' not in df.columns:
                print("   ⚠️ Coluna 'Ticket' não encontrada. Pulando.")
                continue

            df = df.dropna(subset=['Ticket'])
            grupos = df.groupby('Ticket')
            
            count_arquivo = 0

            for ticket_num, dados_ticket in grupos:
                try:
                    # 1. Identifica Ticket
                    try:
                        ticket_id = int(ticket_num)
                    except:
                        continue 

                    # 2. DELETE (Remove o registro antigo/incompleto)
                    conn.execute(text("DELETE FROM eventos_sucata_v2 WHERE ticket_id = :tid"), {"tid": ticket_id})

                    # 3. Prepara Dados Novos
                    base = dados_ticket.iloc[0]
                    
                    # Data
                    data_raw = base.get('Data')
                    hora_raw = base.get('Hora')
                    data_full_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    try:
                        d_str = data_raw.strftime('%Y-%m-%d') if isinstance(data_raw, datetime) else str(data_raw)[:10]
                        h_str = hora_raw.strftime('%H:%M:%S') if isinstance(hora_raw, datetime) else str(hora_raw).strip()
                        if len(h_str) == 5: h_str += ":00"
                        if len(d_str) >= 10: data_full_str = f"{d_str} {h_str}"
                    except: pass

                    # Valores
                    peso_bruto = converter_float(base.get('Pesagem Inicial') or base.get('Peso Bruto'))
                    peso_liquido_total = dados_ticket['Peso Liquido'].apply(converter_float).sum()
                    tara_excel = converter_float(base.get('Tara', 0))
                    peso_tara = tara_excel if tara_excel > 0 else max(0, peso_bruto - peso_liquido_total)

                    comp = converter_float(base.get('Compr.') or base.get('Comprimento'))
                    larg = converter_float(base.get('Largura'))
                    alt = converter_float(base.get('Altura'))
                    cubagem = comp * larg * alt

                    # Classificação Múltipla
                    materiais_str = []
                    soma_impureza_ponderada = 0
                    
                    for _, item in dados_ticket.iterrows():
                        nome = str(item.get('Tipo Metálico', 'DESCONHECIDO')).strip()
                        p_liq_item = converter_float(item.get('Peso Liquido'))
                        pct_item = converter_float(item.get('% Item'))
                        imp_item = converter_float(item.get('%Impureza') or item.get('% Impureza'))

                        if pct_item == 0 and peso_liquido_total > 0:
                            pct_item = (p_liq_item / peso_liquido_total) * 100
                        
                        soma_impureza_ponderada += (p_liq_item * imp_item)
                        materiais_str.append(f"{nome}={pct_item:.1f}|{imp_item:.1f}")
                    
                    string_final = ";".join(materiais_str)
                    media_impureza = (soma_impureza_ponderada / peso_liquido_total) if peso_liquido_total > 0 else 0.0

                    # 4. INSERT NOVO
                    registro = {
                        "ticket_id": ticket_id,
                        "placa_veiculo": str(base.get('Veiculo Placa', 'XXX0000')).strip().upper(),
                        "fornecedor_nome": str(base.get('Fornecedor', 'N/A')).strip(),
                        "produto_declarado": str(base.get('Produto', '')).strip(),
                        "nota_fiscal": str(base.get('Nota Fiscal', '')).split('.')[0],
                        "peso_balanca": peso_bruto,
                        "peso_tara": peso_tara,
                        "peso_liquido": peso_liquido_total,
                        "dim_comprimento": comp,
                        "dim_largura": larg,
                        "dim_altura": alt,
                        "cubagem_m3": cubagem,
                        "tipo_sucata": string_final,
                        "impureza_porcentagem": media_impureza,
                        "data_entrada_sinobras": data_full_str,
                        "status_ticket": "Finalizado",
                        "origem_dado": "Importacao_XLSX",
                        "timestamp_registro": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                        "observacao": f"Classificador: {base.get('Classificador', 'N/A')}"
                    }
                    
                    sql = text("""
                        INSERT INTO eventos_sucata_v2 (
                            ticket_id, placa_veiculo, fornecedor_nome, produto_declarado, nota_fiscal,
                            peso_balanca, peso_tara, peso_liquido, 
                            dim_comprimento, dim_largura, dim_altura, cubagem_m3,
                            tipo_sucata, impureza_porcentagem,
                            data_entrada_sinobras, status_ticket, origem_dado, timestamp_registro, observacao
                        ) VALUES (
                            :ticket_id, :placa_veiculo, :fornecedor_nome, :produto_declarado, :nota_fiscal,
                            :peso_balanca, :peso_tara, :peso_liquido, 
                            :dim_comprimento, :dim_largura, :dim_altura, :cubagem_m3,
                            :tipo_sucata, :impureza_porcentagem,
                            :data_entrada_sinobras, :status_ticket, :origem_dado, :timestamp_registro, :observacao
                        )
                    """)
                    conn.execute(sql, registro)
                    count_arquivo += 1
                    total_tickets += 1
                
                except Exception as e:
                    continue
            
            conn.commit()
            print(f"   -> {count_arquivo} tickets corrigidos.")

        except Exception as file_e:
            print(f"   ❌ Erro ao abrir arquivo: {file_e}")

    conn.close()
    print(f"\n✅ SUCESSO TOTAL: {total_tickets} tickets reprocessados no banco.")

if __name__ == "__main__":
    processar_arquivos()