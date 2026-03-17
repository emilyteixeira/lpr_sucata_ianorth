import sys
import os
import shutil
import requests
import urllib.parse
import subprocess
import time
import threading
from requests.auth import HTTPDigestAuth

from fastapi.responses import StreamingResponse, Response, FileResponse

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, Response 
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from contextlib import asynccontextmanager
from datetime import datetime
from pydantic import BaseModel
from typing import List, Optional, Union
from passlib.context import CryptContext
import jwt

from src import models, database, schemas
from src.services import sinobras
from src.services.intelbras_listener import IntelbrasLPRListener
from src.services.mock_intelbras import MockIntelbrasListener
from src.services.camera_utils import salvar_snapshot_camera
from src.services.video_utils import gravar_video_evento
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "chave_reserva_se_o_env_falhar")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

MODO_DESENVOLVIMENTO = os.getenv("MODO_DESENVOLVIMENTO", "False").lower() == "true"
STATIC_DIR = os.path.join("src", "static")

ultimas_placas_lidas = {}

os.makedirs(os.path.join(STATIC_DIR, "snapshots"), exist_ok=True)

models.Base.metadata.create_all(bind=database.engine)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

listeners_ativos = []

def get_db():
    db = database.SessionLocal()
    try: yield db
    finally: db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Iniciando Sistema e verificando Usuários...")

    db = database.SessionLocal()
    try:
        admin = db.query(models.Usuario).filter(models.Usuario.matricula == "admin").first()
        if not admin:
            print("Criando usuário Gerência padrão...")
            senha_criptografada = pwd_context.hash("admin123")
            novo_admin = models.Usuario(
                nome="Gestão / Diretoria ", 
                matricula="admin", 
                senha_hash=senha_criptografada, 
                role="admin",
                cargo="Diretoria"
            )
            db.add(novo_admin)
            db.commit()
    finally:
        db.close()

    global listeners_ativos

    config = db.query(models.CameraConfig).first()
    db.close()
    if config and config.is_active and config.ip_address:
        ips = [ip.strip() for ip in config.ip_address.split(",") if ip.strip()]
        for ip in ips:
            try:
                l = IntelbrasLPRListener(ip=ip, user=config.username, password=config.password, callback=processar_evento_camera)
                l.start()
                listeners_ativos.append(l)
                print("Listener LPR Ativo e monitoramento...")
            except Exception as e:
                print(f"Erro ao iniciar Listener LPR {ip}: {e}")

    yield
    print("Parando Serviços...")
    for l in listeners_ativos:
        l.stop()
    listeners_ativos.clear()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


class LoginRequest(BaseModel):
    login: str
    password: str


@app.post("/api/auth/login")
def fazer_login(dados: LoginRequest, db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(
        or_(models.Usuario.matricula == dados.login, models.Usuario.cpf == dados.login)).first()
    
    if not usuario or not pwd_context.verify(dados.password, usuario.senha_hash):
        raise HTTPException(status_code=401, detail="Matrícula/CPF ou senha incorretos")
    
    if not usuario.is_active:
        raise HTTPException(status_code=403, detail="Acesso bloqueado. Procure a gerência.")

    token_data = {
        "sub": usuario.matricula, 
        "role": usuario.role, 
        "nome": usuario.nome,
        "cargo": usuario.cargo
    }
    token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)
    
    return {
        "access_token": token, 
        "token_type": "bearer", 
        "user": {
            "nome": usuario.nome, 
            "role": usuario.role, 
            "matricula": usuario.matricula,
            "cargo": usuario
        }
    }

@app.get("/api/usuarios", response_model=List[schemas.UsuarioResponse])
def listar_usuarios(db: Session = Depends(get_db)):
    return db.query(models.Usuario).all()

@app.post("/api/usuarios", response_model=schemas.UsuarioResponse)
def criar_usuario(dados: schemas.UsuarioCreate, db: Session = Depends(get_db)):
    if db.query(models.Usuario).filter((models.Usuario.matricula == dados.matricula)).first():
        raise HTTPException(status_code=400, detail="Matrícula já cadastrada")
    
    novo_usuario = models.Usuario(
        nome=dados.nome,
        matricula=dados.matricula,
        cpf=dados.cpf,
        senha_hash=pwd_context.hash(dados.password),
        role=dados.role,
        cargo=dados.cargo
    )
    db.add(novo_usuario)
    db.commit()
    db.refresh(novo_usuario)
    return novo_usuario

@app.put("/api/usuarios/{usuario_id}/status")
def alterar_status_usuario(usuario_id: int, db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if not usuario: raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    usuario.is_active = not usuario.is_active
    db.commit()
    return {"status": "sucesso", "is_active": usuario.is_active}

@app.put("/api/usuarios/{usuario_id}/reset-senha")
def resetar_senha(usuario_id: int, dados: schemas.PasswordReset, db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if not usuario: raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    usuario.senha_hash = pwd_context.hash(dados.nova_senha)
    db.commit()
    return {"status": "Senha redefinida com sucesso"}




@app.get("/imagens/{pasta}/{nome_arquivo}")
def servir_midia_cors(pasta: str, nome_arquivo: str):
    caminho = os.path.join(STATIC_DIR, pasta, nome_arquivo)
    if not os.path.exists(caminho):
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    return FileResponse(caminho)

@app.get("/")
def read_root():
    return {"status": "Sistema LPR IANorth Online"}


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
    t = threading.Thread(target=_processamento_com_tentativas, args=(placa, origem))
    t.daemon = True
    t.start()

def _processamento_com_tentativas(placa: str, origem: str):
    print(f"Nova placa detectada: {placa} via {origem}. Iniciando auditoria...")

    global ultimas_placas_lidas
    agora = datetime.now()

    if placa in ultimas_placas_lidas:
        tempo_passado = (agora - ultimas_placas_lidas[placa]).total_seconds()
        if tempo_passado < 120:
            print(f"Ignorando placa repetida {placa} (Lida há {tempo_passado:.0f}s)")
            return


    ultimas_placas_lidas[placa] = agora

    max_tentativas = 6
    intervalo_segundos = 15
    dados_api = None
    ticket_valido = False
    raw_date = ""

    for tentativa in range(1, max_tentativas + 1):
        dados_api = sinobras.consultar_truck_arrival(placa)

        if not dados_api:
            print(f"[Tentativas {tentativa}/{max_tentativas}] Placa {placa} não possui ticket ativo. Aguardando {intervalo_segundos}s...")
            time.sleep(intervalo_segundos)
            continue

        produto = str(dados_api.get('tipoProduto', '')).lower()
        if 'sucata' not in produto:
            print(f"Ignorado: Placa {placa} | Produto não é sucata: {produto}")
            return

        raw_date = str(dados_api.get('dataHoraEntrada', ''))
        hoje_iso = datetime.now().strftime("%Y-%m-%d")
        hoje_br = datetime.now().strftime("%d/%m/%Y")

        if hoje_iso in raw_date or hoje_br in raw_date:
            ticket_valido = True
            break
        else:
            print(f"⏳ [Tentativa {tentativa}/{max_tentativas}]Placa {placa} | Ticket ainda antigo ({raw_date}). Aguardando atualização na 2ª balança.")
            time.sleep(intervalo_segundos)
    if not dados_api or not ticket_valido:
        print(f"Falha: A placa {placa} não foi atualizada após {max_tentativas * intervalo_segundos} segundos.")
        if placa in ultimas_placas_lidas:
            del ultimas_placas_lidas[placa]
        return

    ultimas_placas_lidas[placa] = datetime.now()

    timestamp_str = agora.strftime("%Y-%m-%d %H:%M:%S")
    timestamp_file = agora.strftime("%Y%m%d_%H%M%S")

    db = database.SessionLocal()
    try:
        config = db.query(models.CameraConfig).first()
        
        final_snapshot_url = None
        final_video_url = None

        if config and config.is_active:
            try:
                nome_arquivo_foto = f"{placa}_{timestamp_file}.jpg"
                nome_arquivo_video = f"{placa}_{timestamp_file}.mp4"
                ip_real_camera = origem.replace("Cam-", "")

                salvar_snapshot_camera(ip_real_camera, config.username, config.password, placa, nome_fixo=nome_arquivo_foto)
                final_snapshot_url = f"/imagens/snapshots/{nome_arquivo_foto}"
                
                gravar_video_evento(ip_real_camera, config.username, config.password, nome_arquivo_video, duracao=15)
                final_video_url = f"/imagens/videos/{nome_arquivo_video}"
            except Exception as e:
                print(f"Erro de mídia: {e}")

        try:
            dt_obj = datetime.fromisoformat(raw_date)
            data_formatada = dt_obj.strftime("%d/%m/%Y %H:%M")
        except: 
            data_formatada = raw_date

        evento = models.EventoVMS(
            timestamp_registro=timestamp_str,
            placa_veiculo=placa,
            camera_nome=origem,
            ticket_id=dados_api.get('ticket', '0'),
            status_ticket='Aberto',
            fornecedor_nome=dados_api.get('fornecedor', ''),
            produto_declarado=dados_api.get('tipoProduto', ''),
            nota_fiscal=dados_api.get('notaFiscal', ''),
            tipo_veiculo=dados_api.get('tipoVeiculo', 'Caminhao'),
            peso_nf=dados_api.get('peso_nf', 0),
            peso_balanca=float(dados_api.get('pesagemInicial', 0.0)),
            uf_veiculo=dados_api.get('uf', ''),
            data_entrada_sinobras=data_formatada,
            origem_dado="SINOBRAS_API",
            snapshot_url=final_snapshot_url,
            video_url=final_video_url
        )
        db.add(evento)
        db.commit()
        print(f"Evento salvo: Ticket #{evento.ticket_id}")
        
    except Exception as e:
        print(f" Erro ao salvar no banco: {e}")
        db.rollback()
    finally:
        db.close()


def reload_camera_service():
    global listeners_ativos

    print("Parando serviço de câmera atuais...")
    for l in listeners_ativos:
        l.stop()
    listeners_ativos.clear()

    db = database.SessionLocal()
    try:
        config = db.query(models.CameraConfig).first()
        if config and config.is_active and config.ip_address:
            ips = [ip.strip() for ip in config.ip_address.split(",") if ip.strip()]
            print(f"Iniciando conexão REAL com {ips}...")
            for ip in ips:
                try:
                    l = IntelbrasLPRListener(ip=ip, user=config.username, password=config.password, callback=processar_evento_camera)
                    l.start()
                    listeners_ativos.append(l)
                except Exception as e:
                    print(f"Erro ao iniciar camera {ip}: {e}")
    finally:
        db.close() 

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


    if dados.peso_tara is not None: evento.peso_tara = dados.peso_tara
    if dados.dim_comprimento is not None: evento.dim_comprimento = dados.dim_comprimento
    if dados.dim_largura is not None: evento.dim_largura = dados.dim_largura
    if dados.dim_altura is not None: evento.dim_altura = dados.dim_altura
    if dados.impureza_porcentagem is not None: evento.impureza_porcentagem = dados.impureza_porcentagem
    if dados.tipo_sucata is not None: evento.tipo_sucata = dados.tipo_sucata

    def safe_float(val):
        try:
            if val is None: return 0.0
            if isinstance(val, str) and val.strip() == "": return 0.0
            return float(val)
        except Exception:
            return 0.0

        # Calculos automatico
    p_bruto = float(evento.peso_balanca or 0.0)
    p_tara = float(evento.peso_tara or 0.0) 
    evento.peso_liquido = max(0.0, p_bruto - p_tara )

    comp = float(evento.dim_comprimento or 0.0)
    larg = float(evento.dim_largura or 0.0)
    alt = float(evento.dim_altura or 0.0)
    evento.cubagem_m3 = round(comp * larg * alt, 2)

    if evento.cubagem_m3 > 0:
        peso_ton = evento.peso_liquido / 1000.0
        evento.densidade = round(peso_ton / evento.cubagem_m3, 3)
    else: 
        evento.densidade = 0.0

    imp_pct =  safe_float(evento.impureza_porcentagem or 0.0)
    evento.desconto_kg = round(evento.peso_liquido * (imp_pct / 100), 2)

    try:
        db.commit()
        db.refresh(evento)
        return evento
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar: {e}")



@app.get("/eventos/", response_model=List[schemas.EventoLPRResponse])
def listar_eventos(
    skip: int = 0, 
    limit: int = 100, 
    termo: Optional[str] = None, 
    db: Session = Depends(get_db)
):
    query = db.query(models.EventoVMS)

    query = query.filter(models.EventoVMS.produto_declarado.ilike("%sucata%"))

    if termo:
        termo_limpo = termo.strip()
        ticket_busca = None
        if termo_limpo.isdigit():
            ticket_busca = int(termo_limpo)

        query = query.filter(
            or_(
                models.EventoVMS.placa_veiculo.ilike(f"%{termo_limpo}%"),
                models.EventoVMS.fornecedor_nome.ilike(f"%{termo_limpo}%"),
                models.EventoVMS.produto_declarado.ilike(f"%{termo_limpo}%"),
                models.EventoVMS.tipo_sucata.ilike(f"%{termo_limpo}%"), 
                models.EventoVMS.nota_fiscal.ilike(f"%{termo_limpo}%"),
                models.EventoVMS.ticket_id == ticket_busca if ticket_busca else False
            )
        )

    eventos = query.order_by(desc(models.EventoVMS.timestamp_registro)).offset(skip).limit(limit).all()
    return eventos

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

    caminho_fisico = os.path.join(STATIC_DIR, "snapshots", nome_arquivo)

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
    url = f"http://{cam['ip']}/cgi-bin/mjpg/video.cgi?channel=1&subtype=1"

    try:
        req = requests.get(url, auth=HTTPDigestAuth(cam['user'], cam['password']), stream=True, timeout=10)
        content_type = req.headers.get("content-type", "multipart/x-mixed-replace; boundary=frame")
        return StreamingResponse(
            req.iter_content(chunk_size=4096), 
            media_type=content_type,
            status_code=req.status_code
        )
    except Exception as e:
        print(f"Erro no stream de video da garra {garra_id}: {e}")
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
            full_path = os.path.join(STATIC_DIR, path_part)
            if os.path.exists(full_path):
                os.remove(full_path)
        except Exception:
            pass

    evento.fotos_avaria = ",".join(lista_urls) if lista_urls else None
    db.commit()

    return {"status": "Foto removida"}

# ROTAS DE VÍDEO 

@app.get("/proxy/video/garra/{garra_id}")
def proxy_video_stream(garra_id: int):
    """
    Proxy de Vídeo via FFmpeg: Puxa o fluxo RTSP de Alta Resolução (subtype=0),
    transcodifica para MJPEG de alta qualidade e repassa ao navegador 
    sem perdas de pacotes.
    """
    garras = get_garras_config() 
    
    if garra_id < 0 or garra_id >= len(garras):
        return Response(status_code=404, content="Câmera não encontrada")

    cam = garras[garra_id]

    rtsp_url = f"rtsp://{cam['user']}:{cam['password']}@{cam['ip']}:554/cam/realmonitor?channel=1&subtype=0"
   
    def video_generator():
        comando = [
            "ffmpeg",
            "-fflags", "nobuffer", #Desliga fila de espera, tira o delay
            "-flags", "low_delay", # Força o processamento em tempo real.
            "-rtsp_transport", "tcp", 
            "-i", rtsp_url,
            "-vf", "scale=-2:720",
            "-c:v", "mjpeg",
            "-q:v", "5",
            "-r", "10",             
            "-an", 
            "-f", "image2pipe",
            "-"                       
        ]
        
        processo = subprocess.Popen(comando, stdout=subprocess.PIPE, stderr=sys.stderr)
        
        try:
            if processo.stdout is None:
                return
            
            buffer = b''

            while True:
                chunk = processo.stdout.read(8192)
                if not chunk:
                    break
                buffer += chunk

                a = buffer.find(b'\xff\xd8')
                b = buffer.find(b'\xff\xd9')

                if a != -1 and b != -1:
                    if b > a:
                        jpg_data = buffer[a:b+2]
                        buffer = buffer[b+2:] 
                        
                        yield (
                            b'--frame_seguro\r\n'
                            b'Content-Type: image/jpeg\r\n\r\n' + jpg_data + b'\r\n'
                        )
                    else:
                        buffer = buffer[b+2:]

        finally:
            processo.kill() 
            
    return StreamingResponse(
        video_generator(), 
        media_type="multipart/x-mixed-replace; boundary=frame_seguro"
    )

@app.get("/veiculos/{placa}/dados-cadastrais")
def obter_detalhes_veiculos(placa: str, db: Session = Depends(get_db)):
    
    placa_limpa = placa.replace("-", "").replace(" ", "").upper()
    
    if len(placa_limpa) >= 7:
        placa_com_traco = f"{placa_limpa[:3]}-{placa_limpa[3:]}"
    else:
        placa_com_traco = placa_limpa

    print(f"Buscando histórico de cubagem para: {placa_limpa} ou {placa_com_traco}")

    ultimo_evento = db.query(models.EventoVMS).filter(
        or_(
            models.EventoVMS.placa_veiculo.ilike(f"%{placa_limpa}%"),
            models.EventoVMS.placa_veiculo.ilike(f"%{placa_com_traco}%")
        ),
        models.EventoVMS.peso_tara > 0 
    ).order_by(desc(models.EventoVMS.id)).first()
    
    if ultimo_evento:
        def arrumar_medida(valor, limite_logico):
            v = float(valor or 0.0)
            if v == 0: return 0.0
            
            while v > limite_logico:
                v = v / 10.0
                
            return round(v, 2)

        # Limites físicos de um caminhão nas rodovias:
        comp_real = arrumar_medida(ultimo_evento.dim_comprimento, 35)
        larg_real = arrumar_medida(ultimo_evento.dim_largura, 5)
        alt_real = arrumar_medida(ultimo_evento.dim_altura, 5)

        print(f"✅ Memória ativada! Tara: {ultimo_evento.peso_tara}kg | Dim: {comp_real}m x {larg_real}m x {alt_real}m")
        
        return {
            "peso_tara": ultimo_evento.peso_tara,
            "dim_comprimento": comp_real,
            "dim_largura": larg_real,
            "dim_altura": alt_real
        }
        
    print("❌ Nenhum histórico com tara foi encontrado para esta placa.")
    return {}
