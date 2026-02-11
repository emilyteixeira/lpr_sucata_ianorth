import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, Printer, Truck, Scale, Camera, PlayCircle, Trash2,  
    Monitor, Upload, Clock, FileText, User
} from 'lucide-react';

import type { EventoLPR } from '../types';
import { API_BASE_URL, getMediaUrl } from '../config'; 
import { ClassificationCalculator } from '../components/ClassificationCalculator';
import { MediaModal } from '../components/dashboard/MediaModal';

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
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [capturando, setCapturando] = useState(false);

  useEffect(() => { carregarDados(); carregarGarras(); }, [id]);

  useEffect(() => {
    let intervalId: any;
    if (cameraAtivaId !== null) {
        const update = () => setPreviewUrl(`${API_BASE_URL}/proxy/snapshot/garra/${cameraAtivaId}?t=${Date.now()}`);
        update();
        intervalId = setInterval(update, 1000);
    } else { setPreviewUrl(''); }
    return () => clearInterval(intervalId);
  }, [cameraAtivaId]);

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
                setFormData(data);
                setLoading(false); 
            })
      .catch(err => console.error(err));
  }

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
              setTicket(prev => prev ? ({...prev, fotos_avaria: nova}) : null);
              setFormData(prev => ({...prev, fotos_avaria: nova}));
          }
      } catch(e) { alert("Erro."); }
  }

  const atualizarListaFotos = (url: string) => {
      const nova = ticket?.fotos_avaria ? `${ticket.fotos_avaria},${url}` : url;
      if (ticket) setTicket({...ticket, fotos_avaria: nova});
      setFormData(prev => ({...prev, fotos_avaria: nova}));
  }

  if (loading) return <div className="p-10 text-center">Carregando...</div>;
  if (!ticket) return <div className="p-10 text-center text-red-500">Erro.</div>;

  const listaFotos = ticket.fotos_avaria ? ticket.fotos_avaria.split(',').filter(x=>x) : [];
  
  // Auditoria de Peso 
  const pesoBruto = ticket.peso_balanca || 0;
  const pesoTara = Number(formData.peso_tara) || 0;
  const pesoLiquido = Math.max(0, pesoBruto - pesoTara);

  return (
    <div className="space-y-6 pb-20 animate-fade-in font-sans">
      
      {mediaModal && <MediaModal url={mediaModal.url} type={mediaModal.type} onClose={() => setMediaModal(null)} />}

      {/* HEADER DE AÇÕES */}
      <div className="flex justify-between items-center no-print">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors font-medium">
          <ArrowLeft size={20} /> dashboard
        </button>
                <button onClick={() => window.print()} className="flex items-center gap-2 bg-slate-200 dark:bg-slate-700 px-4 py-2 rounded font-medium hover:bg-slate-300"><Printer size={18} /> Imprimir Relatório
                </button>
        </div>

      {/* CABEÇALHO TICKET */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        
        {/* Linha Superior: ID e Status */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <div className="flex items-center gap-3 mb-1">
                    <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Entrada {ticket.origem_dado || 'LPR'}</span>
                    <span className="text-sm text-slate-400 font-mono flex items-center gap-1"><Clock size={12}/> {ticket.timestamp_registro}</span>
                </div>
                <div className="flex items-baseline gap-3">
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Ticket #{ticket.ticket_id}</h1>
                    <span className="text-slate-400 text-sm hidden md:inline">|</span>
                    <span className="text-slate-500 text-sm font-medium">{ticket.camera_nome}</span>
                </div>
            </div>
            
            <div className={`px-5 py-2 rounded-full border text-center flex items-center gap-2 ${ticket.status_ticket?.toLowerCase().includes('final') ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                <span className="block text-[10px] uppercase font-bold opacity-70">Status:</span>
                <span className="text-lg font-bold tracking-tight">{ticket.status_ticket}</span>
            </div>
        </div>

        {/* Linha Inferior: Dados do Transporte em Grid Horizontal */}
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
                    <span className="text-xs text-slate-500">CPF: ---</span>
                </div>

                <div className="flex flex-col md:col-span-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">Fornecedor / Produto</span>
                    <div className="font-bold text-slate-800 dark:text-white truncate" title={ticket.fornecedor_nome}>{ticket.fornecedor_nome || 'Fornecedor Desconhecido'}</div>
                    <div className="text-xs text-slate-500 truncate">{ticket.produto_declarado}</div>
                </div>

                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><FileText size={10}/> Documentação</span>
                    <div className="font-bold text-slate-800 dark:text-white">NF: {ticket.nota_fiscal || '---'}</div>
                    <span className="text-xs text-slate-500">Peso NF: {ticket.peso_nf?.toLocaleString()} kg</span>
                </div>

            </div>
        </div>
      </div>


            {/* AUDITORIA E MÍDIA */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Peso */}
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
                    <div className="text-2xl font-mono font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg border border-green-100 dark:border-green-800">
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
             
             {/* Layout lado a lado agora que temos mais espaço (9 colunas) */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[300px]">
                
                {/* Vídeo */}
                <div 
                    className="h-full bg-black rounded-lg overflow-hidden relative group cursor-pointer shadow-md border border-slate-800"
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
                    ) : <div className="h-full flex items-center justify-center text-slate-500 text-xs font-mono">VÍDEO NÃO DISPONÍVEL</div>}
                </div>

                {/* Foto */}
                <div 
                    className="h-full bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden relative group cursor-pointer border border-slate-200 dark:border-slate-700"
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
                    ) : <div className="h-full flex items-center justify-center text-slate-400 text-xs font-mono">FOTO NÃO DISPONÍVEL</div>}
                </div>

             </div>
          </div>
        </div>
      </div>

    {/* CALCULADORA */}
      <ClassificationCalculator formData={formData} setFormData={setFormData} ticket={ticket} />

    {/* MONITOR DE GARRAS */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2 text-sm uppercase tracking-wide">
            <Monitor size={16} className="text-orange-500"/> Monitoramento de Classificação (Descarga)
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Controles */}
            <div className="space-y-4">
                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-3 block">Selecionar a Garra</label>
                    <div className="flex flex-wrap gap-2">
                        {listaGarras.length > 0 ? listaGarras.map((cam) => (
                            <button key={cam.id} onClick={() => setCameraAtivaId(cameraAtivaId === cam.id ? null : cam.id)}
                                className={`flex-1 px-3 py-2 rounded text-xs font-bold border transition-all ${cameraAtivaId === cam.id ? 'bg-red-600 text-white border-red-700 shadow-md transform scale-105' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 hover:bg-slate-100'}`}>
                                {cam.nome}
                            </button>
                        )) : <span className="text-xs text-slate-400">Nenhuma garra configurada no sistema.</span>}
                    </div>
                </div>

                <div>
                     <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Observações do Classificador</label>
                     <div className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 h-24 overflow-y-auto text-sm text-slate-600 dark:text-slate-300 italic">
                        {ticket?.observacao || 'Nenhuma observação registrada.'}
                     </div>
                </div>
            </div>

            {/* Monitor */}
            <div className="lg:col-span-2 space-y-4">
                {cameraAtivaId !== null ? (
                    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden flex items-center justify-center border-2 border-slate-800 shadow-xl group">
                        {previewUrl ? <img src={previewUrl} className="w-full h-full object-contain" alt="Ao Vivo" /> : <div className="text-white animate-pulse text-xs">Conectando ao stream...</div>}
                        <div className="absolute top-4 left-4 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded animate-pulse flex items-center gap-1"><span className="w-2 h-2 bg-white rounded-full"></span> AO VIVO</div>
                        
                        <button onClick={handleCapturaGarra} disabled={capturando} 
                            className="absolute bottom-4 right-4 bg-white/90 hover:bg-white text-slate-900 px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2 transition-transform active:scale-95 opacity-0 group-hover:opacity-100">
                            {capturando ? 'Salvando...' : <><Camera size={18} className="text-red-600"/> Capturar Foto</>}
                        </button>
                    </div>
                ) : (
                    <div className="w-full h-full min-h-[250px] bg-slate-100 dark:bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 gap-2">
                        <Monitor size={40} className="opacity-50"/>
                        <span className="text-sm font-medium">Selecione uma garra para visualizar</span>
                    </div>
                )}
                
                {/* Galeria */}
                {listaFotos.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-2 px-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2"><Camera size={12}/> Evidências coletadas ({listaFotos.length})</span>
                            <label className="cursor-pointer text-[10px] font-bold text-blue-600 hover:text-blue-500 flex items-center gap-1">
                                <Upload size={10}/> Upload Manual <input type="file" className="hidden" onChange={handleUploadManual} disabled={uploading} />
                            </label>
                        </div>
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                            {listaFotos.map((url, idx) => (
                                <div key={idx} className="relative group w-20 h-20 flex-shrink-0 bg-slate-100 rounded-lg overflow-hidden cursor-pointer hover:ring-2 ring-blue-500 transition border border-slate-200" onClick={() => setMediaModal({url, type: 'image'})}>
                                    <img src={getMediaUrl(url)} className="w-full h-full object-cover"/>
                                    <button onClick={(e) => handleDeleteFoto(url, e)} className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-all shadow-sm"><Trash2 size={10}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>

    </div>
  );
}

