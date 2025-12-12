import random

def consultar_sistemas_sinobras(placa: str):
    """
    Simula o retorno dos dados oficiais baseados no conteudo da planilha GPP.
    """
    print(f"--- MOCK - Consultando dados para placa {placa} ---")
    
    fornecedores = ["METALURGICA GOMES", "SUCATAS BRASIL", "RECICLAGEM SANTA MARIA", "FERRO VELHO DO ZÉ"]
    produtos = ["SUCATA MISTA", "SUCATA MIUDA", "SUCATA PESADA", "ESTAMPARIA"]
    tipos = ["TRUCK", "CARRETA", "BITREM"]

    peso_nf = random.randint(15000, 45000)
    peso_balanca = peso_nf + random.randint(-200, 200)

    return {
        "ticket_id": random.randint(20240000, 20249999),
        "status_ticket": "ABERTO",
        "fornecedor": random.choice(fornecedores),
        "produto": random.choice(produtos),
        "nota_fiscal": f"{random.randint(1000, 9999)}",
        "tipo_veiculo": random.choice(tipos),
        "peso_nf": float(peso_nf),
        "peso_balanca": float(peso_balanca)
    }
