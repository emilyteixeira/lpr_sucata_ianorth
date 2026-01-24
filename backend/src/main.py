from requests import session
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager
from datetime import datetime
from typing import List
import os

from src import models, database, schemas
from src.services import services_mock  
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



def processar_evento_camera(placa: str, origem: str):
    print(f" Nova placa detectada: {placa}")
    
    timestamp_obj = datetime.now()
    timestamp_str = timestamp_obj.strftime("%Y-%m-%d %H:%M:%S")
    timestamp_file = timestamp_obj.strftime("%Y%m%d_%H%M%S")
    
    db = database.SessionLocal()

    config = db.query(models.CameraConfig).first()
    
    final_snapshot_url = None
    final_video_url = None
    origem_dado = "MOCK"

    if config and config.is_active:
        origem_dado = "REAL"
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
        'status_ticket': 'N/A', 
        'fornecedor': '',           
        'produto': '',
        'nota_fiscal': '',
        'tipo_veiculo': 'CAMINHAO', 
        'peso_nf': 0, 
        'peso_balanca': 0           
    }
    
    try:

        dados_api = sinobras.consultar_truck_arrival(placa)

        if dados_api:
            print(" Dados encontrados na Sinobras!")
            origem_dado = "SINOBRAS_API"
            dados_erp['ticket_id'] = dados_api.get('ticket', '0')
            dados_erp['status_ticket'] = dados_api.get('status', 'Classificado')
            dados_erp['fornecedor'] = dados_api.get('fornecedor', '')
            dados_erp['produto'] = dados_api.get('tipoProduto', '')
            dados_erp['nota_fiscal'] = dados_api.get('notaFiscal', '')
            dados_erp['tipo_veiculo'] = dados_api.get('tipoVeiculo', 'Caminhao')
            dados_erp['peso_balanca'] = float(dados_api.get('pesagemInicial', 0.0))

        
        else:
            print(" Sinobras não retornou. Usando Mock local.")
            origem_dado = "MOCK_FALLBACK"
            mock_res = services_mock.consultar_sistemas_sinobras(placa)
            
            dados_erp['ticket_id'] = str(mock_res.get('ticket_id', 0))
            dados_erp['status_ticket'] = mock_res.get('status_ticket', 'Simulado')
            dados_erp['fornecedor'] = mock_res.get('fornecedor', 'Forn. Mock')
            dados_erp['peso_balanca'] = mock_res.get('peso_balanca', 0.0)
            dados_erp['peso_nf'] = dados_api.get('peso_nf', 0)


    except Exception as e:
        print(f"Erro na integração de dados: {e}")

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
            snapshot_url=final_snapshot_url, # URL certa
            video_url=final_video_url        # URL certa
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
    """Lê o banco de dados e inicia/reinicia o serviço da câmera"""
    global monitor
    
    if monitor:
        print("Parando serviço de câmera atual...")
        monitor.stop()
        monitor = None

    db = database.SessionLocal()
    config = db.query(models.CameraConfig).first()
    db.close()

    if config and config.is_active:
        print(f" Iniciando conexão REAL com {config.ip_address}...")
        monitor = IntelbrasLPRListener(
            ip=config.ip_address,
            user=config.username,
            password=config.password,
            callback=processar_evento_camera
        )
        monitor.start()
    
    elif MODO_DESENVOLVIMENTO:
        print(" Nenhuma config ativa. Iniciando MOCK...")
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
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)

base_dir = os.path.dirname(os.path.abspath(__file__))
static_dir = os.path.join(base_dir, "static")
app.mount("/imagens", StaticFiles(directory=static_dir), name="static")


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

@app.put("/eventos/{evento_id}", response_model=schemas.EventoLPRResponse)
def atualizar_evento(evento_id: int, dados: schemas.EventoUpdate, db: Session = Depends(get_db)):

    evento =db.query(models.EventoVMS).filter(models.EventoVMS.id == evento_id).first()

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

    try:
        db.commit()
        db.refresh(evento)
        print(f"Evento #{evento_id} atualizado manualmente.")
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
