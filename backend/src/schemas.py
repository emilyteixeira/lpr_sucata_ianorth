from pydantic import BaseModel
from typing import Optional

class EventoUpdate(BaseModel):
    ticket_id: Optional[int] = None
    status_ticket: Optional[str] = None
    motorista: Optional[str] = None
    fornecedor_nome: Optional[str] = None
    produto_declarado: Optional[str] = None
    nota_fiscal: Optional[str] = None
    tipo_veiculo: Optional[str] = None
    peso_nf: Optional[float] = None
    peso_balanca: Optional[float] = None

class EventoLPRResponse(BaseModel):
    id: int
    timestamp_registro: str
    placa_veiculo: str
    camera_nome: str
    
    ticket_id: Optional[int] = None
    status_ticket: Optional[str] = None
    motorista: Optional[str] = None
    fornecedor_nome: Optional[str] = None
    produto_declarado: Optional[str] = None
    nota_fiscal: Optional[str] = None
    tipo_veiculo: Optional[str] = None
    
    peso_nf: Optional[float] = None
    peso_balanca: Optional[float] = None
    
    snapshot_url: Optional[str] = None
    video_url: Optional[str] = None
    origem_dado: Optional[str] = None

    class Config:
        from_attributes = True

class CameraConfigSchema(BaseModel):
    ip_address: str
    username: str
    password: str
    is_active: bool = True

    class Config:
        from_attributes = True
