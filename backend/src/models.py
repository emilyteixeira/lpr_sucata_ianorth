from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean 
from src.database import Base
from datetime import datetime

class EventoVMS(Base):
    __tablename__ = "eventos_sucata_v2"

    id = Column(Integer, primary_key=True, index=True)
    timestamp_registro = Column(String)
    placa_veiculo = Column(String(50), index=True)
    camera_nome = Column(String)
    
    ticket_id = Column(Integer, nullable=True)
    status_ticket = Column(String, nullable=True)

    motorista = Column(String, nullable=True)

    fornecedor_nome = Column(String, nullable=True)
    produto_declarado = Column(String, nullable=True)
    nota_fiscal = Column(String, nullable=True)
    tipo_veiculo = Column(String, nullable=True)
    peso_nf = Column(Float, nullable=True)
    peso_balanca = Column(Float, nullable=True)
    
    origem_dado = Column(String)
    snapshot_url = Column(String, nullable=True)
    video_url = Column(String, nullable=True)

class CameraConfig(Base):
    __tablename__ = "camera_config"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, default="Principal")
    ip_address = Column(String)
    username = Column(String)
    password = Column(String)
    is_active = Column(Boolean, default=True)
