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
    nota_fiscal = Column(String(100), nullable=True)
    tipo_veiculo = Column(String(100), nullable=True)
    peso_nf = Column(Float, nullable=True)
    peso_balanca = Column(Float, nullable=True)
    
    origem_dado = Column(String(50))
    snapshot_url = Column(String(500), nullable=True)
    video_url = Column(String(500), nullable=True)

class CameraConfig(Base):
    __tablename__ = "camera_config"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), default="Principal")
    ip_address = Column(String(50))
    username = Column(String(100))
    password = Column(String(100))
    is_active = Column(Boolean, default=True)
