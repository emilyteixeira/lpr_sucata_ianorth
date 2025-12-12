export interface EventoLPR {
    id: number;
    timestamp_registro: string;
    placa_veiculo: string;
    camera_nome?: string;
    
    ticket_id?: number;
    status_ticket?: string;
    motorista?: string;
    fornecedor_nome?: string;    
    produto_declarado?: string;  
    nota_fiscal?: string;
    tipo_veiculo?: string;
    
    peso_nf?: number;
    peso_balanca?: number;
    
    snapshot_url?: string | null;
    video_url?: string | null;
}
