import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, Printer, Truck, Scale, MapPin, Calendar, 
    Camera, PlayCircle, Edit3, Save, X, Trash2, Aperture, 
    Monitor, Upload, ChevronDown, ChevronUp 
} from 'lucide-react';
import type { EventoLPR } from '../types';
import { API_BASE_URL, getMediaUrl } from '../config'; 

interface GarraConfig {
    id: number;
    nome: string;
}

export function TicketDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [ticket, setTicket] = useState<EventoLPR | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<EventoLPR>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [listaGarras, setListaGarras] = useState<GarraConfig[]>([]);
  const [cameraAtivaId, setCameraAtivaId] = useState<number | null>(null); 
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [capturando, setCapturando] = useState(false);

  useEffect(() => {
    carregarDados();
    carregarGarras();
  }, [id]);

  useEffect(() => {
    let intervalId: any;
    
    if (cameraAtivaId !== null) {
        const atualizarImagem = () => {
            const timestamp = new Date().getTime();
            const url = `${API_BASE_URL}/proxy/snapshot/garra/${cameraAtivaId}?t=${timestamp}`;
            setPreviewUrl(url);
        };
        atualizarImagem();
        intervalId = setInterval(atualizarImagem, 800);
    } else {
        setPreviewUrl('');
    }

    return () => { if (intervalId) clearInterval(intervalId); };
  }, [cameraAtivaId]);

  const carregarGarras = async () => {
    try {
        const res = await fetch(`${API_BASE_URL}/config/garras`);
        if (res.ok) setListaGarras(await res.json());
    } catch (e) { console.error("Erro garras:", e); }
  };

  const carregarDados = () => {
    fetch(`${API_BASE_URL}/eventos/${id}`)
      .then(res => res.json())
      .then(data => {
        setTicket(data);
        setFormData(data); 
        setLoading(false);
      })
      .catch(err => console.error("Erro:", err));
  }

  const handleSave = async () => {
    setSaving(true);
    try {
        const res = await fetch(`${API_BASE_URL}/eventos/${id}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                ticket_id: Number(formData.ticket_id),
                motorista: formData.motorista,
                fornecedor_nome: formData.fornecedor_nome,
                produto_declarado: formData.produto_declarado,
                nota_fiscal: formData.nota_fiscal,
                tipo_veiculo: formData.tipo_veiculo,
                peso_nf: Number(formData.peso_nf),
                peso_balanca: Number(formData.peso_balanca),
                status_ticket: formData.status_ticket,
                observacao: formData.observacao 
            })
        });

        if (res.ok) {
            const atualizado = await res.json();
            setTicket(atualizado);
            setIsEditing(false);
            const btn = document.getElementById('btn-save');
            if(btn) btn.innerText = "Salvo!";
            setTimeout(() => { if(btn) btn.innerText = "Salvar Alterações" }, 2000);
        } else {
            alert("Erro ao salvar dados.");
        }
    } catch (e) {
        alert("Erro de conexão.");
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
        if (res.ok) {
            const data = await res.json();
            atualizarListaFotos(data.url);
        } else {
            alert("Falha na captura.");
        }
    } catch (e) {
        alert("Erro de conexão.");
    } finally {
        setCapturando(false);
    }
  };

  const handleUploadManual = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);
    const dataUpload = new FormData();
    dataUpload.append('file', e.target.files[0]);
    try {
        const res = await fetch(`${API_BASE_URL}/eventos/${id}/upload-avaria`, {
            method: 'POST',
            body: dataUpload
        });
        if (res.ok) {
            const data = await res.json();
            atualizarListaFotos(data.url);
        }
    } catch (error) { console.error(error); } finally { setUploading(false); }
  };

  const handleDeleteFoto = async (fotoUrl: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if(!window.confirm("Apagar esta evidência?")) return;
    try {
        const res = await fetch(`${API_BASE_URL}/eventos/${id}/remover-foto`, {
            method: 'DELETE',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ foto_url: fotoUrl })
        });
        if(res.ok) {
            const novaString = ticket?.fotos_avaria?.split(',')
                .filter(url => url.trim() !== fotoUrl.trim())
                .join(',');
            setTicket(prev => prev ? ({...prev, fotos_avaria: novaString}) : null);
            setFormData(prev => ({...prev, fotos_avaria: novaString}));
        }
    } catch (err) { alert("Erro ao deletar."); }
  }

  const atualizarListaFotos = (novaUrl: string) => {
    const novaLista = ticket?.fotos_avaria ? `${ticket.fotos_avaria},${novaUrl}` : novaUrl;
    if (ticket) setTicket({ ...ticket, fotos_avaria: novaLista });
    setFormData(prev => ({ ...prev, fotos_avaria: novaLista }));
  }

  if (loading) return <div className="p-8 text-center text-slate-500">Carregando...</div>;
  if (!ticket) return <div className="p-8 text-center text-red-500">Ticket não encontrado.</div>;

  const pesoBalanca = isEditing ? Number(formData.peso_balanca) : (ticket.peso_balanca || 0);
  const pesoNF = isEditing ? Number(formData.peso_nf) : (ticket.peso_nf || 0);
  const divergencia = pesoBalanca - pesoNF;
  const temDivergencia = Math.abs(divergencia) > 100;

  const listaFotos = ticket.fotos_avaria ? ticket.fotos_avaria.split(',').filter(x => x) : [];
  const cameraAtivaNome = listaGarras.find(g => g.id === cameraAtivaId)?.nome;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      <div className="flex justify-between items-center no-print">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
          <ArrowLeft size={20} /> DashBoard
        </button>
        <div className="flex gap-3">
            {!isEditing ? (
                <>
                    <button onClick={() => window.print()} className="flex items-center gap-2 bg-slate-200 dark:bg-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-300 transition-colors">
                        <Printer size={18} /> Imprimir Relatório
                    </button>
                    <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/30">
                        <Edit3 size={18} /> Editar Dados
                    </button>
                </>
            ) : (
                <>
                    <button onClick={() => setIsEditing(false)} className="flex items-center gap-2 bg-slate-200 dark:bg-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-red-100 hover:text-red-600 transition-colors">
                        <X size={18} /> Cancelar
                    </button>
                    <button id="btn-save" onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-500 transition-colors shadow-lg shadow-green-500/30">
                        {saving ? 'Salvando...' : <><Save size={18} /> Salvar Alterações</>}
                    </button>
                </>
            )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-wrap justify-between items-start gap-4">
        <div>
            <div className="flex items-center gap-3 mb-2">
                <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded uppercase">Entrada</span>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    Ticket #{isEditing ? (
                        <input type="number" className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-2 w-40 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={formData.ticket_id || ''} onChange={e => setFormData({...formData, ticket_id: Number(e.target.value)})} />
                    ) : ticket.ticket_id || '---'}
                </h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Calendar size={16}/> {ticket.timestamp_registro} • <MapPin size={16}/> {ticket.camera_nome}
            </p>
        </div>
        
        <div className={`px-4 py-2 rounded-lg border ${ticket.status_ticket === 'ABERTO' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            <span className="block text-xs uppercase font-bold opacity-70">Status Atual</span>
            {isEditing ? (
                <select className="bg-transparent font-bold text-xl outline-none" value={formData.status_ticket || 'ABERTO'} onChange={e => setFormData({...formData, status_ticket: e.target.value})}>
                    <option value="ABERTO">ABERTO</option>
                    <option value="FECHADO">FECHADO</option>
                    <option value="BLOQUEADO">BLOQUEADO</option>
                </select>
            ) : <span className="text-xl font-bold">{ticket.status_ticket}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 h-full">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Truck size={18} className="text-blue-500"/> Dados do Transporte
            </h3>
            <div className="space-y-4">
                <InfoRow label="Placa (LPR)" value={ticket.placa_veiculo} highlight />
                <InputRow label="Motorista" field="motorista" data={formData} setData={setFormData} editing={isEditing} />
                <InputRow label="Tipo Veículo" field="tipo_veiculo" data={formData} setData={setFormData} editing={isEditing} />
                <div className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-4">
                    <InputRow label="Fornecedor" field="fornecedor_nome" data={formData} setData={setFormData} editing={isEditing} />
                    <InputRow label="Nota Fiscal" field="nota_fiscal" data={formData} setData={setFormData} editing={isEditing} />
                    <InputRow label="Produto" field="produto_declarado" data={formData} setData={setFormData} editing={isEditing} />
                </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 h-full">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <Scale size={18} className="text-blue-500"/> Auditoria de Peso
            </h3>
            <div className="space-y-6">
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg">
                <span className="text-xs text-slate-500 uppercase font-bold">Peso Declarado (NF)</span>
                <div className="flex items-end gap-2">
                    {isEditing ? (
                        <input type="number" className="bg-white dark:bg-black border border-slate-300 dark:border-slate-700 rounded p-1 text-2xl font-mono w-full"
                            value={formData.peso_nf || ''} onChange={e => setFormData({...formData, peso_nf: Number(e.target.value)})} />
                    ) : <div className="text-2xl font-mono text-slate-700 dark:text-slate-300">{pesoNF.toLocaleString()}</div>}
                    <span className="text-sm mb-1 text-slate-500">kg</span>
                </div>
              </div>
              <div className="bg-slate-100 dark:bg-black p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-500 uppercase font-bold">Peso Aferido (Balança)</span>
                <div className="flex items-end gap-2">
                    {isEditing ? (
                        <input type="number" className="bg-white dark:bg-slate-800 border border-blue-500 rounded p-1 text-3xl font-bold font-mono w-full text-blue-600"
                            value={formData.peso_balanca || ''} onChange={e => setFormData({...formData, peso_balanca: Number(e.target.value)})} />
                    ) : <div className="text-3xl font-bold font-mono text-slate-900 dark:text-white">{pesoBalanca.toLocaleString()}</div>}
                    <span className="text-sm mb-1 text-slate-500">kg</span>
                </div>
              </div>
              <div className={`p-4 rounded-lg border flex justify-between items-center ${temDivergencia ? 'bg-red-50 text-red-800 border-red-200' : 'bg-green-50 text-green-800 border-green-200'}`}>
                <span className="font-medium">Divergência</span>
                <span className="font-bold font-mono text-lg">{divergencia > 0 ? '+' : ''}{divergencia} kg</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="p-3 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
                <Camera size={16} className="text-blue-500"/> <span className="font-semibold text-sm">Registro de Entrada (LPR)</span>
            </div>
            <div className="aspect-video bg-black flex items-center justify-center">
                {ticket.snapshot_url ? (
                    <img 
                        src={getMediaUrl(ticket.snapshot_url)} 
                        className="w-full h-full object-contain cursor-pointer hover:opacity-90 transition"
                        onClick={() => window.open(getMediaUrl(ticket.snapshot_url), '_blank')}
                    />
                ) : <span className="text-slate-500 text-sm">Sem imagem</span>}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="p-3 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
                <PlayCircle size={16} className="text-blue-500"/> <span className="font-semibold text-sm">Replay da Entrada</span>
            </div>
            <div className="aspect-video bg-black flex items-center justify-center">
                {ticket.video_url ? (
                    <video controls className="w-full h-full">
                        <source src={getMediaUrl(ticket.video_url)} type="video/mp4" />
                        Seu navegador não suporta vídeos.
                    </video>
                ) : <span className="text-slate-500 text-sm">Sem gravação</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Edit3 size={18} className="text-orange-500"/> Eventos & impurezas
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <div className="lg:col-span-1">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Observações do Classificador
                </label>
                {isEditing ? (
                    <textarea 
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 h-64 focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 dark:text-slate-200 resize-none shadow-inner"
                        placeholder="Descreva impurezas, objetos estranhos..."
                        value={formData.observacao || ''}
                        onChange={e => setFormData({...formData, observacao: e.target.value})}
                    />
                ) : (
                    <div className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50 rounded-lg p-3 h-64 overflow-y-auto text-slate-600 dark:text-slate-400 italic">
                        {ticket?.observacao || 'Nenhuma observação registrada.'}
                    </div>
                )}
            </div>

            <div className="lg:col-span-2 flex flex-col gap-4">
                
                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                     <div className="flex gap-2 overflow-x-auto">
                        {listaGarras.length > 0 ? listaGarras.map((cam) => (
                            <button 
                                key={cam.id}
                                onClick={() => setCameraAtivaId(cam.id === cameraAtivaId ? null : cam.id)}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border flex items-center gap-2 ${
                                    cameraAtivaId === cam.id 
                                    ? 'bg-red-600 text-white border-red-700 shadow-lg transform scale-105' 
                                    : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600'
                                }`}
                            >
                                <Monitor size={16}/> {cam.nome} 
                                {cameraAtivaId === cam.id ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                            </button>
                        )) : <span className="text-xs text-slate-400 px-2">Sem garras configuradas</span>}
                    </div>
                    
                    <label className="cursor-pointer flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-500 px-2 border-l border-slate-300 dark:border-slate-600 ml-2 pl-4">
                        <Upload size={14}/> {uploading ? '...' : 'Upload Manual'}
                        <input type="file" className="hidden" accept="image/*" onChange={handleUploadManual} disabled={uploading} />
                    </label>
                </div>

                {cameraAtivaId !== null && (
                    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center border border-slate-800 shadow-lg group animate-in fade-in slide-in-from-top-4 duration-300">
                        {previewUrl ? (
                            <img src={previewUrl} className="w-full h-full object-contain" alt="Live" />
                        ) : <div className="text-white animate-pulse text-xs">Conectando...</div>}
                        
                        <div className="absolute top-3 left-3 bg-red-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 backdrop-blur-sm">
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span> AO VIVO: {cameraAtivaNome}
                        </div>
                        
                        <button 
                            onClick={handleCapturaGarra}
                            disabled={capturando}
                            className="absolute bottom-4 bg-red-600 hover:bg-red-500 text-white px-8 py-3 rounded-full font-bold shadow-xl transition-transform active:scale-95 flex items-center gap-2 border-2 border-white/20"
                        >
                            {capturando ? 'Salvando...' : <><Aperture size={24} /> REGISTRAR IMPUREZA</>}
                        </button>

                        <button 
                            onClick={() => setCameraAtivaId(null)}
                            className="absolute top-3 right-3 bg-black/50 hover:bg-black/80 text-white p-2 rounded-full transition-colors"
                            title="Fechar Monitor"
                        >
                            <X size={16} />
                        </button>
                    </div>
                )}

                <div className="bg-slate-50 dark:bg-slate-900/30 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50 min-h-[100px]">
                    <div className="flex items-center gap-2 mb-2">
                        <Camera size={14} className="text-slate-400"/>
                        <span className="text-xs font-bold text-slate-500 uppercase">Evidências Coletadas ({listaFotos.length})</span>
                    </div>
                    {listaFotos.length > 0 ? (
                        <div className="grid grid-cols-5 gap-2">
                            {listaFotos.map((fotoUrl, idx) => (
                                <div key={idx} className="relative group aspect-square bg-slate-200 dark:bg-slate-700 rounded overflow-hidden border border-slate-300 dark:border-slate-600 shadow-sm">
                                    <img 
                                        src={getMediaUrl(fotoUrl)} 
                                        className="w-full h-full object-cover cursor-pointer hover:opacity-90"
                                        onClick={() => window.open(getMediaUrl(fotoUrl), '_blank')}
                                    />
                                    <button 
                                        onClick={(e) => handleDeleteFoto(fotoUrl, e)}
                                        className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-700 transition-all shadow-md"
                                        title="Excluir"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : <p className="text-center text-xs text-slate-400 py-4">Nenhuma impureza registrada.</p>}
                </div>

            </div>
        </div>
      </div>

    </div>
  );
}

function InfoRow({ label, value, highlight }: any) {
    return (
        <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-700/50 pb-2 last:border-0 last:pb-0 h-8">
            <span className="text-sm text-slate-500 w-1/3">{label}</span>
            <span className={`font-medium text-right w-2/3 truncate ${highlight ? 'text-lg font-mono font-bold bg-slate-100 dark:bg-slate-900 px-2 rounded' : 'text-slate-700 dark:text-slate-200'}`}>{value || '---'}</span>
        </div>
    )
}
function InputRow({ label, field, data, setData, editing }: any) {
    return (
        <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-700/50 pb-2 last:border-0 last:pb-0 h-8">
            <span className="text-sm text-slate-500 w-1/3">{label}</span>
            {editing ? (
                <input type="text" className="w-2/3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-0.5 text-right text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                    value={data[field] || ''} onChange={e => setData({...data, [field]: e.target.value})} placeholder="---" />
            ) : <span className="font-medium text-slate-700 dark:text-slate-200 text-right w-2/3 truncate text-sm">{data[field] || '---'}</span>}
        </div>
    )
}
