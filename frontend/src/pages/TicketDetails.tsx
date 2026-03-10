import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, Printer, Truck, Scale, Camera, PlayCircle, Trash2,  
    Monitor, Upload, Clock, FileText, User, Download, CheckCircle
} from 'lucide-react';

import type { EventoLPR } from '../types';
import { API_BASE_URL, getMediaUrl } from '../config'; 
import { ClassificationCalculator } from '../components/ClassificationCalculator';
import { MediaModal } from '../components/dashboard/MediaModal';
import { gerarPDFTicket }
from '../../utils/pdfGenerator';

interface GarraConfig { id: number; nome: string; }

export function TicketDetails() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [ticket, setTicket] = useState<EventoLPR | null>(null);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState<Partial<EventoLPR>>({});
    const [uploading, setUploading] = useState(false);
    const [mediaModal, setMediaModal] = useState<{url: string, type: 'image' | 'video'} | null>(null);
    const [listaGarras, setListaGarras] = useState<GarraConfig[]>([]);
    const [cameraAtivaId, setCameraAtivaId] = useState<number | null>(null);
    const [capturando, setCapturando] = useState(false);
    const [saving, setSaving] = useState(false);

    const [gerandoPdf, setGerandoPdf] = useState(false)

    useEffect(() => { carregarDados(); carregarGarras(); }, [id]);

    const carregarGarras = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/config/garras`);
            if (res.ok) setListaGarras(await res.json());
        } catch (e) { console.error(e); }
    };

    const carregarDados = () => {
        fetch(`${API_BASE_URL}/eventos/${id}`)
            .then(res => res.json())
            .then(data => { 
                setTicket(data);
                    
                if (!data.peso_tara || data.peso_tara === 0){
                    fetch(`${API_BASE_URL}/veiculos/${data.placa_veiculo}/dados-cadastrais`)
                        .then(r => r.json())
                        .then(historico => {
                            setFormData({
                                ...data,
                                peso_tara: historico.peso_tara || data.peso_tara,
                                dim_comprimento: historico.dim_comprimento || data.dim_comprimento,
                                dim_largura: historico.dim_largura || data.dim_largura,
                                dim_altura: historico.dim_altura || data.dim_altura
                            });
                            setLoading(false);
                })
                        .catch(() => {
                            setFormData(data);
                            setLoading(false);
                        });
                } else {
                    setFormData(data);
                    setLoading(false); 
                }
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }


    const handleFinalizarTicket = async () => {
        const confirmacao = window.confirm(
            "ATENÇÃO: Você está prestes a FINALIZAR a classificação deste ticket.\n\n" +
          "Verifique se os materiais, pesos, cubagem, fotos e observações estão corretos.\n\n" +
          "Deseja salvar tudo e liberar o motorista?"
        );
        if (!confirmacao) return;

        setSaving(true);
        try {
            const payload = {
                ...formData,
                status_ticket: 'Finalizado'
            };

            const res = await fetch(`${API_BASE_URL}/eventos/${ticket?.id}`,{
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert("Ticket salvo e finalizado com sucesso!");
                navigate('/');
            } else {
                alert("Erro ao finalizar o ticket no banco de dados.");
            }
        } catch (e) {
            alert("Erro de conexão ao salvar.");
        } finally {
            setSaving(false);
        }
    }; 

    const handleCapturaGarra = async () => {
        if (cameraAtivaId === null) return;
        setCapturando(true);
        try {
            const res = await fetch(`${API_BASE_URL}/eventos/${id}/captura-remota`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ garra_id: cameraAtivaId })
            });
            if (res.ok) { const d = await res.json(); atualizarListaFotos(d.url); }
            else alert("Falha na captura.");
        } catch (e) { alert("Erro."); } finally { setCapturando(false); }
    };

    const handleUploadManual = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        setUploading(true);
        const fd = new FormData(); fd.append('file', e.target.files[0]);
        try {
            const res = await fetch(`${API_BASE_URL}/eventos/${id}/upload-avaria`, { method: 'POST', body: fd });
            if (res.ok) { const d = await res.json(); atualizarListaFotos(d.url); }
        } catch (e) { console.error(e); } finally { setUploading(false); }
    };

    const handleDeleteFoto = async (url: string, e: React.MouseEvent) => {
        e.stopPropagation(); if(!confirm("Apagar?")) return;
        try {
            const res = await fetch(`${API_BASE_URL}/eventos/${id}/remover-foto`, {
                method: 'DELETE', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ foto_url: url })
            });
            if(res.ok) {
                const nova = ticket?.fotos_avaria?.split(',').filter(u => u !== url).join(',');
                setTicket(prev => prev ? ({...prev, fotos_avaria: nova} as EventoLPR) : null);
                setFormData(prev => ({...prev, fotos_avaria: nova}));
            }
        } catch(e) { alert("Erro."); }
    }

    const atualizarListaFotos = (url: string) => {
        const nova = ticket?.fotos_avaria ? `${ticket.fotos_avaria},${url}` : url;
        if (ticket) setTicket({...ticket, fotos_avaria: nova});
        setFormData(prev => ({...prev, fotos_avaria: nova}));
    }

    const handleDownloadFotos = () => {
        if (!ticket?.fotos_avaria) return alert("Não há fotos para baixar neste ticket.");
        const fotos = ticket.fotos_avaria.split(',');

        fotos.forEach((foto, idx) => {
            const link = document.createElement('a');
            link.href = getMediaUrl(foto);
            link.download = `Ticket_${ticket.ticket_id}_Foto_${idx + 1}.jpg`;
            link.target = "_blank"; 
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    };

    if (loading) return <div className="p-10 text-center">Carregando...</div>;
    if (!ticket) return <div className="p-10 text-center text-red-500">Erro ao carregar ticket.</div>;

    const isFinalizado = ticket.status_ticket === 'Finalizado';
    const listaFotos = ticket.fotos_avaria ? ticket.fotos_avaria.split(',').filter(x=>x) : [];
    const pesoBruto = ticket.peso_balanca || 0;
    const pesoTara = Number(formData.peso_tara) || 0;
    const pesoLiquido = Math.max(0, pesoBruto - pesoTara);

    return (
        <div className="space-y-6 pb-20 animate-fade-in font-sans max-w-[1600px] mx-auto p-4 md:p-6">

            {mediaModal && <MediaModal url={mediaModal.url} type={mediaModal.type} onClose={() => setMediaModal(null)} />}

            {/* HEADER DE AÇÕES */}
            <div className="flex justify-between items-center no-print">
                <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors font-medium">
                    <ArrowLeft size={20} /> Dashboard
                </button>
                <div className="flex gap-2">
                    <button onClick={handleDownloadFotos} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-4 py-2 rounded font-bold hover:bg-slate-200 transition text-sm">
                        <Download size={16} /> Baixar Evidências
                    </button>


                    <button 
                        onClick={async () => {
                            setGerandoPdf(true);
                            await gerarPDFTicket(formData);
                            setGerandoPdf(false);
                        }} 
                        disabled={gerandoPdf}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700 transition text-sm shadow-md disabled:opacity-50"
                    >
                        <Printer size={16} /> {gerandoPdf ? 'Gerando...' : 'Exportar R.I.M (PDF)'}
                    </button>


                    {!isFinalizado && (
                    <button 
                        onClick={handleFinalizarTicket}
                        disabled={saving}
                        className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded font-bold hover:bg-green-500 transition text-sm shadow-md disabled:opacity-50"
                    > 
                        <CheckCircle size={16}/> {saving ? 'Salvando tudo...' : 'Finalizar Ticket'}
                    </button>
                    )}
                </div>
            </div>

            {/* CABEÇALHO TICKET */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">

                {/* ID e Status */}
                <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                                {ticket.origem_dado || 'LPR AUTO'}
                            </span>
                            <span className="text-sm text-slate-400 font-mono flex items-center gap-1">
                                <Clock size={12}/> {ticket.timestamp_registro}
                            </span>
                        </div>
                        <div className="flex flex-col md:flex-row md:items-baseline gap-1 md:gap-3">
                            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Ticket #{ticket.ticket_id}</h1>
                            <span className="text-slate-500 text-sm font-medium">{ticket.camera_nome}</span>
                        </div>
                    </div>

                    <div className={`px-5 py-2 rounded-full border text-center flex items-center gap-2 ${isFinalizado ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                        <span className="block text-[10px] uppercase font-bold opacity-70">Status</span>
                        <span className="text-lg font-bold tracking-tight uppercase">{ticket.status_ticket || 'EM ABERTO'}</span>
                    </div>
                </div>

                {/* Dados do Transporte */}
                <div className="bg-slate-50 dark:bg-slate-900/50 p-5">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-sm">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><Truck size={10}/> Veículo</span>
                            <div className="font-bold text-slate-800 dark:text-white text-lg">{ticket.placa_veiculo}</div>
                            <span className="text-xs text-slate-500">{ticket.tipo_veiculo || 'Caminhão'} - {ticket.uf_veiculo || 'UF'}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><User size={10}/> Motorista</span>
                            <div className="font-bold text-slate-800 dark:text-white truncate" title={ticket.motorista}>{ticket.motorista || 'Não identificado'}</div>
                        </div>
                        <div className="flex flex-col md:col-span-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">Fornecedor / Produto</span>
                            <div className="font-bold text-slate-800 dark:text-white truncate" title={ticket.fornecedor_nome}>{ticket.fornecedor_nome || 'Fornecedor Desconhecido'}</div>
                            <div className="text-xs text-slate-500 truncate">{ticket.produto_declarado}</div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><FileText size={10}/> Nota Fiscal</span>
                            <div className="font-bold text-slate-800 dark:text-white">{ticket.nota_fiscal || '---'}</div>
                            {ticket.data_entrada_sinobras && (
                                <span className="text-[10px] text-orange-600 font-bold block mt-1">
                                    Chegada: {ticket.data_entrada_sinobras}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Auditoria de Peso */}
                <div className="md:col-span-3 flex flex-col gap-6">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex-1">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2 text-sm uppercase tracking-wide">
                            <Scale size={16} className="text-blue-600"/> Auditoria de Peso
                        </h3>
                        <div className="space-y-6 mt-4">
                            <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800/30 text-center">
                                <span className="text-[10px] text-blue-600 dark:text-blue-400 block uppercase font-bold mb-1">Peso Bruto (Entrada)</span>
                                <span className="text-3xl font-mono font-extrabold text-blue-900 dark:text-white tracking-tight">
                                    {pesoBruto.toLocaleString()} <span className="text-sm font-sans text-blue-400">kg</span>
                                </span>
                            </div>
                            <div className="flex justify-between items-center px-2 py-2 border-b border-slate-100 dark:border-slate-700">
                                <span className="text-xs font-bold text-slate-500 uppercase">Tara</span>
                                <span className="font-mono text-lg font-bold text-slate-700 dark:text-slate-300">{pesoTara.toLocaleString()} <span className="text-xs font-normal">kg</span></span>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-green-600 uppercase block mb-1">Peso Líquido Calculado</span>
                                <div className="text-2xl font-mono font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg border border-green-100 dark:border-green-800 text-center">
                                    {pesoLiquido.toLocaleString()} kg
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mídia LPR */}
                <div className="md:col-span-9">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm h-full">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2 text-sm uppercase tracking-wide">
                            <Camera size={16} className="text-blue-600"/> Registro Visual da Entrada
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[300px]">
                            <div 
                                className="h-full bg-black rounded-lg overflow-hidden relative group cursor-pointer shadow-md border border-slate-800 flex items-center justify-center"
                                onClick={() => ticket.video_url && setMediaModal({url: ticket.video_url, type: 'video'})}
                            >
                                {ticket.video_url ? (
                                    <>
                                        <video className="w-full h-full object-contain opacity-90 group-hover:opacity-100 transition"><source src={getMediaUrl(ticket.video_url)} type="video/mp4"/></video>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="bg-white/20 backdrop-blur-sm p-3 rounded-full group-hover:bg-white/30 transition shadow-lg">
                                                <PlayCircle className="text-white" size={40}/>
                                            </div>
                                        </div>
                                        <span className="absolute top-3 left-3 text-[10px] font-bold text-white bg-red-600 px-2 py-0.5 rounded shadow-sm">VÍDEO DA PASSAGEM</span>
                                    </>
                                ) : (
                                        <div className="flex flex-col items-center gap-2 opacity-30">
                                            <PlayCircle size={40} className="text-slate-500"/>
                                            <span className="text-xs font-mono text-slate-500">SEM REGISTRO DE VÍDEO</span>
                                        </div>
                                    )}
                            </div>
                            <div 
                                className="h-full bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden relative group cursor-pointer border border-slate-200 dark:border-slate-700 flex items-center justify-center"
                                onClick={() => ticket.snapshot_url && setMediaModal({url: ticket.snapshot_url, type: 'image'})}
                            >
                                {ticket.snapshot_url ? (
                                    <>
                                        <img src={getMediaUrl(ticket.snapshot_url)} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition flex items-center justify-center">
                                            <Camera className="text-white opacity-0 group-hover:opacity-100 transition drop-shadow-md" size={32}/>
                                        </div>
                                        <span className="absolute top-3 left-3 text-[10px] font-bold text-slate-700 bg-white/90 px-2 py-0.5 rounded shadow-sm border">FOTO LPR</span>
                                    </>
                                ) : (
                                        <div className="flex flex-col items-center gap-2 opacity-30">
                                            <Camera size={40} className="text-slate-400"/>
                                            <span className="text-xs font-mono text-slate-400">SEM FOTO REGISTRADA</span>
                                        </div>
                                    )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* CALCULADORA */}
            <ClassificationCalculator formData={formData} setFormData={setFormData} ticket={ticket} isFinalizado={isFinalizado} />

            {/* OBSERVAÇÕES E EVIDÊNCIAS*/}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm no-print">
                <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2 text-sm uppercase tracking-wide">
                    <Monitor size={16} className="text-orange-500"/> 
                    {isFinalizado ? 'Observações e Evidências' : 'Monitoramento de Classificação (Descarga)'}
                </h3>

                <div className={`grid grid-cols-1 ${isFinalizado ? 'lg:grid-cols-2' : 'lg:grid-cols-3'} gap-6`}>
                    
                    {/* Bloco Câmera / Observações */}
                    <div className="space-y-4">
                        {!isFinalizado && (
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-3 block">Selecionar Câmera</label>
                                <div className="flex flex-wrap gap-2">
                                    {listaGarras.length > 0 ? listaGarras.map((cam) => (
                                        <button key={cam.id} onClick={() => setCameraAtivaId(cameraAtivaId === cam.id ? null : cam.id)}
                                            className={`flex-1 px-3 py-2 rounded text-xs font-bold border transition-all ${cameraAtivaId === cam.id ? 'bg-red-600 text-white border-red-700 shadow-md transform scale-105' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 hover:bg-slate-100'}`}>
                                            {cam.nome}
                                        </button>
                                    )) : <span className="text-xs text-slate-400">Nenhuma garra configurada.</span>}
                                </div>
                            </div>
                        )}

                        <div>
                            <div className="flex justify-between items-end mb-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Observações do Classificador</label>
                            </div>
                            <textarea 
                                className={`w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 ${isFinalizado ? 'min-h-[150px]' : 'h-24'} text-sm text-slate-700 dark:text-slate-200 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition placeholder:text-slate-400 disabled:opacity-60`}
                                placeholder="Descreva detalhes sobre a classificação: Eventos e impurezas..."
                                value={formData.observacao || ''}
                                onChange={(e) => setFormData({...formData, observacao: e.target.value})}
                                disabled={isFinalizado}
                            />
                        </div>
                    </div>

                    {/* Bloco de Vídeo e Galeria */}
                    <div className={`${isFinalizado ? 'lg:col-span-1' : 'lg:col-span-2'} space-y-4`}>
                        
                        {/* Visualizador de Vídeo */}
                        {!isFinalizado && (
                            cameraAtivaId !== null ? (
                                <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden flex items-center justify-center border-2 border-slate-800 shadow-xl group">
                                    <img 
                                        src={`${API_BASE_URL}/proxy/video/garra/${cameraAtivaId}`} 
                                        className="w-full h-full object-contain" 
                                        alt="Ao Vivo"
                                        onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                                    />
                                    <div className="absolute top-4 left-4 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded animate-pulse flex items-center gap-1"><span className="w-2 h-2 bg-white rounded-full"></span> AO VIVO</div>

                                    <button onClick={handleCapturaGarra} disabled={capturando} 
                                        className="absolute bottom-4 right-4 bg-white/90 hover:bg-white text-slate-900 px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2 transition-transform active:scale-95 opacity-0 group-hover:opacity-100">
                                        {capturando ? 'Salvando...' : <><Camera size={18} className="text-red-600"/> Capturar Evidência</>}
                                    </button>
                                </div>
                            ) : (
                                <div className="w-full h-full min-h-[250px] bg-slate-100 dark:bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 gap-2">
                                    <Monitor size={40} className="opacity-50"/>
                                    <span className="text-sm font-medium">Selecione uma câmera para monitorar a descarga</span>
                                </div>
                            )
                        )}

                        {/* GALERIA DE EVIDÊNCIAS*/}
                        <div className={`bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 ${!isFinalizado ? 'mt-2' : 'h-full'}`}>
                            <div className="flex items-center justify-between mb-3 px-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                                    <Camera size={12}/> Evidências ({listaFotos.length})
                                </span>

                                <label className={`cursor-pointer text-[10px] font-bold flex items-center gap-2 px-3 py-1.5 rounded transition shadow-sm ${uploading ? 'bg-gray-100 text-gray-400' : 'bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                                    <Upload size={12}/> 
                                    {uploading ? 'Enviando...' : 'Adicionar Foto'}
                                    <input type="file" className="hidden" onChange={handleUploadManual} disabled={uploading} accept="image/*" />
                                </label>
                            </div>

                            {listaFotos.length > 0 ? (
                                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                                    {listaFotos.map((url, idx) => (
                                        <div key={idx} className="relative group w-20 h-20 flex-shrink-0 bg-slate-100 rounded-lg overflow-hidden cursor-pointer hover:ring-2 ring-blue-500 transition border border-slate-200" onClick={() => setMediaModal({url, type: 'image'})}>
                                            <img src={getMediaUrl(url)} className="w-full h-full object-cover"/>
                                            <button onClick={(e) => handleDeleteFoto(url, e)} className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-all shadow-sm"><Trash2 size={10}/></button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                    <div className="h-20 border-2 border-dashed border-slate-100 dark:border-slate-700 rounded-lg flex flex-col items-center justify-center text-slate-400 gap-1 bg-slate-50 dark:bg-slate-900/30">
                                        <span className="text-[10px] font-bold uppercase opacity-50">Nenhuma evidência registrada</span>
                                        <span className="text-[9px] opacity-40">Faça o upload das salvas no seu dispositivos</span>
                                    </div>
                                )}
                        </div>
                    </div>

                </div>
            </div>

        </div>
    );
}
