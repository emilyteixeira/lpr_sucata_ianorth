import sys
import os
import shutil
import requests
from requests.auth import HTTPDigestAuth

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, Response 
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager
from datetime import datetime
from pydantic import BaseModel
from typing import List

from src import models, database, schemas
from src.services import sinobras
from src.services.intelbras_listener import IntelbrasLPRListener
from src.services.mock_intelbras import MockIntelbrasListener
from src.services.camera_utils import salvar_snapshot_camera
from src.services.video_utils import gravar_video_evento
from dotenv import load_dotenv

load_dotenv()

monitor = None
MODO_DESENVOLVIMENTO = os.getenv("MODO_DESENVOLVIMENTO", "False").lower() == "true"

models.Base.metadata.create_all(bind=database.engine)


def get_db():
    db = database.SessionLocal()
    try: yield db
    finally: db.close()

def get_garras_config():
    """Lê configuração das garras do arquivo .env (não usa banco de dados)"""
    ips = os.getenv("GARRAS_IPS", "").split(",")
    user = os.getenv("GARRAS_USER", "admin")
    password = os.getenv("GARRAS_PASS", "")

    garras = []
    for idx, ip in enumerate(ips):
        if ip.strip():
            garras.append({
                "id": idx,
                "nome": f"Garra {idx + 1}",
                "ip": ip.strip(),
                "user": user,
                "password": password
            })
    return garras

def processar_evento_camera(placa: str, origem: str):
    print(f"Nova placa detectada: {placa}")
    
    timestamp_obj = datetime.now()
    timestamp_str = timestamp_obj.strftime("%Y-%m-%d %H:%M:%S")
    timestamp_file = timestamp_obj.strftime("%Y%m%d_%H%M%S")
    
    db = database.SessionLocal()
    config = db.query(models.CameraConfig).first()
    
    final_snapshot_url = None
    final_video_url = None
    origem_dado = "Desconhecido"

    if config and config.is_active:
        origem_dado = "CAMERA_REAL"
        try:
            nome_arquivo_foto = f"{placa}_{timestamp_file}.jpg"
            nome_arquivo_video = f"{placa}_{timestamp_file}.mp4"

            salvar_snapshot_camera(
                config.ip_address, 
                config.username, 
                config.password, 
                placa, 
                nome_fixo=nome_arquivo_foto  
            )
            final_snapshot_url = f"/imagens/snapshots/{nome_arquivo_foto}"
            
            gravar_video_evento(
                config.ip_address, config.username, config.password, nome_arquivo_video, duracao=15
            )
            final_video_url = f"/imagens/videos/{nome_arquivo_video}"
            
        except Exception as e:
            print(f"Erro ao capturar mídia real: {e}")
    
    elif MODO_DESENVOLVIMENTO:
        final_snapshot_url = "/imagens/mock.jpg"
        final_video_url = "/imagens/mock.jpg"

    dados_erp = {
        'ticket_id': 0, 
        'status_ticket': '', 
        'fornecedor': '',           
        'produto': '',
        'nota_fiscal': '',
        'tipo_veiculo': '', 
        'peso_nf': 0, 
        'peso_balanca': 0           
    }
    
    try:
        dados_api = sinobras.consultar_truck_arrival(placa) 

        if dados_api:
            print("Dados encontrados na Sinobras!")
            origem_dado = "SINOBRAS_API"
            dados_erp['ticket_id'] = dados_api.get('ticket', '0')
            dados_erp['status_ticket'] = dados_api.get('status', 'Classificado')
            dados_erp['fornecedor'] = dados_api.get('fornecedor', '')
            dados_erp['produto'] = dados_api.get('tipoProduto', '')
            dados_erp['nota_fiscal'] = dados_api.get('notaFiscal', '')
            dados_erp['tipo_veiculo'] = dados_api.get('tipoVeiculo', 'Caminhao')
            dados_erp['peso_balanca'] = float(dados_api.get('pesagemInicial', 0.0))
        else:
            print("Placa não encontrada. Salvando registro vazio.")
            origem_dado = "NAO_ENCONTRADO"
           
    except Exception as e:
        print(f"Erro na integração de dados: {e}")
        origem_dado = "ERRO_INTEGRACAO"

    try:
        evento = models.EventoVMS(
            timestamp_registro=timestamp_str,
            placa_veiculo=placa,
            camera_nome=origem,
            ticket_id=dados_erp['ticket_id'],
            status_ticket=dados_erp['status_ticket'],
            fornecedor_nome=dados_erp['fornecedor'],
            produto_declarado=dados_erp['produto'],
            nota_fiscal=dados_erp['nota_fiscal'],
            tipo_veiculo=dados_erp['tipo_veiculo'],
            peso_nf=dados_erp['peso_nf'],
            peso_balanca=dados_erp['peso_balanca'],
            origem_dado=origem_dado,
            snapshot_url=final_snapshot_url,
            video_url=final_video_url
        )
        db.add(evento)
        db.commit()
        print(f"Evento salvo: Ticket #{evento.ticket_id}")
        
    except Exception as e:
        print(f"Erro ao salvar no banco: {e}")
        db.rollback()
    finally:
        db.close()

def reload_camera_service():
    global monitor
    
    if monitor:
        print("Parando serviço de câmera atual...")
        monitor.stop()
        monitor = None

    db = database.SessionLocal()
    config = db.query(models.CameraConfig).first()
    db.close()

    if config and config.is_active:
        print(f"Iniciando conexão REAL com {config.ip_address}...")
        monitor = IntelbrasLPRListener(
            ip=config.ip_address,
            user=config.username,
            password=config.password,
            callback=processar_evento_camera
        )
        monitor.start()
    
    elif MODO_DESENVOLVIMENTO:
        print("Nenhuma config ativa. Iniciando MOCK...")
        monitor = MockIntelbrasListener("0.0.0.0", "admin", "123", processar_evento_camera)
        monitor.start()
    else:
        print(" Aguardando configuração de câmera...")

@asynccontextmanager
async def lifespan(app: FastAPI):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    static_dir = os.path.join(base_dir, "static")
    os.makedirs(os.path.join(static_dir, "snapshots"), exist_ok=True)
    os.makedirs(os.path.join(static_dir, "videos"), exist_ok=True)
    
    reload_camera_service()
    yield
    if monitor: monitor.stop()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

base_dir = os.path.dirname(os.path.abspath(__file__))
static_dir = os.path.join(base_dir, "static")
app.mount("/imagens", StaticFiles(directory=static_dir), name="static")

# ROTAS DA CÂMERA LPR - BANCO DE DADOS

@app.get("/config/camera", response_model=schemas.CameraConfigSchema)
def get_camera_config(db: Session = Depends(get_db)):
    config = db.query(models.CameraConfig).first()
    if not config:
        return schemas.CameraConfigSchema(
            ip_address="", username="", password="", is_active=False
        )
    return config

@app.post("/config/camera")
def save_camera_config(dados: schemas.CameraConfigSchema, db: Session = Depends(get_db)):
    config = db.query(models.CameraConfig).first()
    
    if not config:
        config = models.CameraConfig()
        db.add(config)
    
    config.ip_address = dados.ip_address
    config.username = dados.username
    config.password = dados.password
    config.is_active = dados.is_active
    
    db.commit()
    reload_camera_service()
    return {"status": "Configuração salva e câmera reconectada!"}

# ROTAS DE EVENTOS

@app.put("/eventos/{evento_id}", response_model=schemas.EventoLPRResponse)
def atualizar_evento(evento_id: int, dados: schemas.EventoUpdate, db: Session = Depends(get_db)):
    evento = db.query(models.EventoVMS).filter(models.EventoVMS.id == evento_id).first()

    if not evento:
        raise HTTPException(status_code=404, detail="Evento não encontrado")

    if dados.ticket_id is not None: evento.ticket_id = dados.ticket_id
    if dados.status_ticket is not None: evento.status_ticket = dados.status_ticket
    if dados.motorista is not None: evento.motorista = dados.motorista
    if dados.fornecedor_nome is not None: evento.fornecedor_nome = dados.fornecedor_nome
    if dados.produto_declarado is not None: evento.produto_declarado = dados.produto_declarado
    if dados.nota_fiscal is not None: evento.nota_fiscal = dados.nota_fiscal
    if dados.tipo_veiculo is not None: evento.tipo_veiculo = dados.tipo_veiculo
    if dados.peso_nf is not None: evento.peso_nf = dados.peso_nf
    if dados.peso_balanca is not None: evento.peso_balanca = dados.peso_balanca
    if dados.observacao is not None: evento.observacao = dados.observacao

    try:
        db.commit()
        db.refresh(evento)
        return evento
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar: {e}")

@app.get("/eventos/", response_model=List[schemas.EventoLPRResponse])
def listar_eventos(db: Session = Depends(get_db)):
    return db.query(models.EventoVMS).order_by(models.EventoVMS.id.desc()).limit(100).all()

@app.get("/eventos/{evento_id}", response_model=schemas.EventoLPRResponse)
def obter_detalhes_evento(evento_id: int, db: Session = Depends(get_db)):
    evento = db.query(models.EventoVMS).filter(models.EventoVMS.id == evento_id).first()
    if not evento:
        raise HTTPException(status_code=404, detail="Ticket não encontrado")
    return evento

@app.get("/admin/sincronizar-antigos")
def sincronizar_registros_antigos(db: Session = Depends(get_db)):
    print("Iniciando sincronização de legado...")
    eventos_pendentes = db.query(models.EventoVMS).filter(
        (models.EventoVMS.origem_dado != "SINOBRAS_API") | 
        (models.EventoVMS.ticket_id == "0")
    ).all()
    
    atualizados = 0
    erros = 0
    
    for evento in eventos_pendentes:
        try:
            if isinstance(evento.timestamp_registro, str):
                data_registro = evento.timestamp_registro.split(" ")[0]
            else:
                data_registro = evento.timestamp_registro.strftime("%Y-%m-%d")
            
            dados_api = sinobras.consultar_truck_arrival(evento.placa_veiculo, data_iso=data_registro)
            if dados_api:
                evento.ticket_id = str(dados_api.get('ticket', '0'))
                evento.status_ticket = dados_api.get('status', 'Classificado')
                evento.fornecedor_nome = dados_api.get('fornecedor', '')
                evento.produto_declarado = dados_api.get('tipoProduto', '')
                evento.nota_fiscal = dados_api.get('notaFiscal', '')
                evento.tipo_veiculo = dados_api.get('tipoVeiculo', '')
                evento.peso_balanca = float(dados_api.get('pesagemInicial', 0.0))
                evento.origem_dado = "SINOBRAS_API (Retroativo)"
                atualizados += 1
        except Exception as e:
            erros += 1
            continue
    db.commit()
    return {"status": "Finalizado", "atualizados": atualizados, "erros": erros}

@app.post("/eventos/{evento_id}/upload-avaria")
def upload_foto_avaria(evento_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    evento = db.query(models.EventoVMS).filter(models.EventoVMS.id == evento_id).first()
    if not evento:
        raise HTTPException(status_code=404, detail="Evento Não Encontrado")

    timestamp_file = datetime.now().strftime("%Y%m%d_%H%M%S")
    nome_seguro = file.filename.replace(" ", "_")
    nome_arquivo = f"avaria_{evento_id}_{timestamp_file}_{nome_seguro}"

    caminho_fisico = os.path.join(static_dir, "snapshots", nome_arquivo)

    try:
        with open(caminho_fisico, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao salvar arquivo: {e}")

    url_relativa = f"/imagens/snapshots/{nome_arquivo}"

    if evento.fotos_avaria:
        evento.fotos_avaria += f",{url_relativa}"
    else:
        evento.fotos_avaria = url_relativa

    db.commit()
    db.refresh(evento)
    return {"status": "Sucesso", "url": url_relativa, "lista_atual": evento.fotos_avaria}

# ROTAS DAS GARRAS

@app.get("/config/garras")
def listar_garras_endpoint():
    configs = get_garras_config()
    return [{"id": g["id"], "nome": g["nome"]} for g in configs]

@app.get("/proxy/snapshot/garra/{garra_id}")
def proxy_snapshot_garra_id(garra_id: int):
    """
    Proxy para visualização ao vivo.
    CORREÇÃO: Usa get_garras_config() para ler do .env em vez de consultar o banco.
    """
    garras = get_garras_config()  
    
    if garra_id < 0 or garra_id >= len(garras):
        return Response(status_code=404)

    cam = garras[garra_id]
    url = f"http://{cam['ip']}/cgi-bin/snapshot.cgi"

    try:
        resp = requests.get(url, auth=HTTPDigestAuth(cam['user'], cam['password']), timeout=2)
        if resp.status_code == 200:
            return Response(content=resp.content, media_type="image/jpeg")
        else:
            return Response(status_code=resp.status_code)
    except Exception as e:
        print(f"Erro proxy garra {garra_id}: {e}")
        return Response(status_code=503)

class GarraCaptureRequest(BaseModel):
    garra_id: int

@app.post("/eventos/{evento_id}/captura-remota")
def captura_snapshot_garra(evento_id: int, dados: GarraCaptureRequest, db: Session = Depends(get_db)):
    """
    Captura imagem da garra e salva no ticket.
    CORREÇÃO: Usa get_garras_config() para pegar credenciais.
    """
    garras = get_garras_config() 
    
    if dados.garra_id < 0 or dados.garra_id >= len(garras):
        raise HTTPException(status_code=404, detail="Garra não encontrada")

    cam = garras[dados.garra_id]

    evento = db.query(models.EventoVMS).filter(models.EventoVMS.id == evento_id).first()
    if not evento:
        raise HTTPException(status_code=404, detail="Ticket não encontrado")

    timestamp_file = datetime.now().strftime("%Y%m%d_%H%M%S")
    nome_arquivo = f"Garra_{dados.garra_id + 1}_{evento_id}_{timestamp_file}.jpg"

    caminho = salvar_snapshot_camera(cam['ip'], cam['user'], cam['password'], "GARRA", nome_fixo=nome_arquivo)

    if not caminho:
        raise HTTPException(status_code=500, detail="Falha ao conectar na câmera para captura")

    url_relativa = f"/imagens/snapshots/{nome_arquivo}"

    if evento.fotos_avaria:
        evento.fotos_avaria += f",{url_relativa}"
    else:
        evento.fotos_avaria = url_relativa

    db.commit()
    return {"status": "Capturado", "url": url_relativa}

class FotoDeleteRequest(BaseModel):
    foto_url: str

@app.delete("/eventos/{evento_id}/remover-foto")
def remover_foto_avaria(evento_id: int, dados: FotoDeleteRequest, db: Session = Depends(get_db)):
    evento = db.query(models.EventoVMS).filter(models.EventoVMS.id == evento_id).first()
    if not evento or not evento.fotos_avaria:
        raise HTTPException(status_code=404, detail="Evento ou fotos não encontrados.")

    lista_urls = evento.fotos_avaria.split(',')
    url_limpa = dados.foto_url.strip()

    if url_limpa in lista_urls:
        lista_urls.remove(url_limpa)
        
        try:
            path_part = url_limpa.replace("/imagens/", "")
            full_path = os.path.join(static_dir, path_part)
            if os.path.exists(full_path):
                os.remove(full_path)
        except Exception:
            pass

    evento.fotos_avaria = ",".join(lista_urls) if lista_urls else None
    db.commit()

    return {"status": "Foto removida"}
