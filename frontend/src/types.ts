export interface EventoLPR {
    id: number;
    timestamp_registro: string;
    placa_veiculo: string;
    camera_nome?: string;
    origem_dado?: string;
    
    ticket_id?: number;
    status_ticket?: string;
    motorista?: string;
    fornecedor_nome?: string;    
    produto_declarado?: string;  
    nota_fiscal?: string;
    tipo_veiculo?: string;
    uf_veiculo?: string;    
    data_entrada_sinobras?: string; 
    codigo_fluxo?: string;

    peso_nf?: number;
    peso_balanca?: number;
    
    snapshot_url?: string | null;
    video_url?: string | null;

    observacao?: string;
    fotos_avaria?: string;

    peso_tara?: number;
    peso_liquido?: number;
    
    dim_comprimento?: number;
    dim_largura?: number;
    dim_altura?: number;
    
    cubagem_m3?: number;
    densidade?: number; 
    
    tipo_sucata?: string;
    impureza_porcentagem?: number;
    desconto_kg?: number;   
}

export interface CubagemState {
    placa_atual: string | null;
    volume_atual_m3: number | null;
    modelo_tipo: string;
    fps: number;
    calibracao_status: "ok" | "ausente" | "invalida";
    ultimo_screenshot: string | null;
    engine_status?: string;
}

export interface HomographyCalibration {
    matriz: number[][] | null;
    frame_base64: string | null;
    status?: string;
}

export interface ManualMeasurement {
    placa: string;
    comprimento_m: number;
    largura_m: number;
    altura_m: number;
}
