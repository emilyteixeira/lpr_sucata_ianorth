from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean
from src.database import Base
from datetime import datetime

class EventoVMS(Base):
    __tablename__ = "eventos_sucata_v2"

    id = Column(Integer, primary_key=True, index=True)
    timestamp_registro = Column(String(50)) 
    
    placa_veiculo = Column(String(20), index=True)
    
    camera_nome = Column(String(100))
    
    ticket_id = Column(Integer, nullable=True)
    status_ticket = Column(String(100), nullable=True)

    motorista = Column(String(200), nullable=True)

    fornecedor_nome = Column(String(200), nullable=True)
    produto_declarado = Column(String(200), nullable=True)
    tipo_sucata = Column(String(255), nullable=True) 
    uf_veiculo = Column(String(10), nullable=True)
    data_entrada_sinobras = Column(String(50), nullable=True)
    nota_fiscal = Column(String(100), nullable=True)
    tipo_veiculo = Column(String(100), nullable=True)
    peso_nf = Column(Float, nullable=True)
    peso_balanca = Column(Float, nullable=True)
    
    origem_dado = Column(String(50))
    codigo_fluxo = Column(String(20), nullable=True) # F3, F13

    snapshot_url = Column(String(500), nullable=True)
    video_url = Column(String(500), nullable=True)

    observacao = Column(String(1000), nullable=True)
    fotos_avaria = Column(String(4000), nullable=True)

    # COLUNAS DA CLASSIFICAÇÃO 
    peso_tara = Column(Float, nullable=True)
    peso_liquido = Column(Float, nullable=True)
    dim_comprimento = Column(Float, nullable=True)
    dim_largura = Column(Float, nullable=True)
    dim_altura = Column(Float, nullable=True)
    cubagem_m3 = Column(Float, nullable=True)
    densidade = Column(Float, nullable=True)
    impureza_porcentagem = Column(Float, nullable=True)
    desconto_kg = Column(Float, nullable=True)


class CameraConfig(Base):
    __tablename__ = "camera_config"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), default="Principal")
    ip_address = Column(String(50))
    username = Column(String(100))
    password = Column(String(100))
    is_active = Column(Boolean, default=True)
