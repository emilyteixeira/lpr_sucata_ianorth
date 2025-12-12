import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Truck, Scale, MapPin, Calendar, Camera, PlayCircle, Edit3, Save, X } from 'lucide-react';
import type { EventoLPR } from '../types';
import { API_BASE_URL, getMediaUrl } from '../config';

export function TicketDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [ticket, setTicket] = useState<EventoLPR | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<EventoLPR>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    carregarDados();
  }, [id]);

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
                status_ticket: formData.status_ticket
            })
        });

        if (res.ok) {
            const atualizado = await res.json();
            setTicket(atualizado);
            setIsEditing(false);
            alert("Dados atualizados com sucesso!");
        } else {
            alert("Erro ao salvar dados.");
        }
    } catch (e) {
        alert("Erro de conexão.");
    } finally {
        setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Carregando...</div>;
  if (!ticket) return <div className="p-8 text-center text-red-500">Ticket não encontrado.</div>;

  const pesoBalanca = isEditing ? Number(formData.peso_balanca) : (ticket.peso_balanca || 0);
  const pesoNF = isEditing ? Number(formData.peso_nf) : (ticket.peso_nf || 0);
  const divergencia = pesoBalanca - pesoNF;
  const temDivergencia = Math.abs(divergencia) > 100;

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
                    <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-500 transition-colors shadow-lg shadow-green-500/30">
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
                    Ticket #
                    {isEditing ? (
                        <input 
                            type="number" 
                            className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-2 w-40 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={formData.ticket_id || ''}
                            onChange={e => setFormData({...formData, ticket_id: Number(e.target.value)})}
                        />
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
                <select 
                    className="bg-transparent font-bold text-xl outline-none"
                    value={formData.status_ticket || 'ABERTO'}
                    onChange={e => setFormData({...formData, status_ticket: e.target.value})}
                >
                    <option value="ABERTO">ABERTO</option>
                    <option value="FECHADO">FECHADO</option>
                    <option value="BLOQUEADO">BLOQUEADO</option>
                </select>
            ) : (
                <span className="text-xl font-bold">{ticket.status_ticket}</span>
            )}
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
                        <input 
                            type="number" 
                            className="bg-white dark:bg-black border border-slate-300 dark:border-slate-700 rounded p-1 text-2xl font-mono w-full"
                            value={formData.peso_nf || ''}
                            onChange={e => setFormData({...formData, peso_nf: Number(e.target.value)})}
                        />
                    ) : (
                        <div className="text-2xl font-mono text-slate-700 dark:text-slate-300">
                            {pesoNF.toLocaleString()}
                        </div>
                    )}
                    <span className="text-sm mb-1 text-slate-500">kg</span>
                </div>
              </div>

              <div className="bg-slate-100 dark:bg-black p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-500 uppercase font-bold">Peso Aferido (Balança)</span>
                <div className="flex items-end gap-2">
                    {isEditing ? (
                        <input 
                            type="number" 
                            className="bg-white dark:bg-slate-800 border border-blue-500 rounded p-1 text-3xl font-bold font-mono w-full text-blue-600"
                            value={formData.peso_balanca || ''}
                            onChange={e => setFormData({...formData, peso_balanca: Number(e.target.value)})}
                        />
                    ) : (
                        <div className="text-3xl font-bold font-mono text-slate-900 dark:text-white">
                            {pesoBalanca.toLocaleString()}
                        </div>
                    )}
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
                <Camera size={16} className="text-blue-500"/> <span className="font-semibold text-sm">Registro Fotográfico</span>
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
                        <source src={`http://127.0.0.1:8000${ticket.video_url}`} type="video/mp4" />
                    </video>
                ) : <span className="text-slate-500 text-sm">Sem gravação</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


function InfoRow({ label, value, highlight }: any) {
    return (
        <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-700/50 pb-2 last:border-0 last:pb-0 h-10">
            <span className="text-sm text-slate-500 w-1/3">{label}</span>
            <span className={`font-medium text-right w-2/3 truncate ${highlight ? 'text-lg font-mono font-bold bg-slate-100 dark:bg-slate-900 px-2 rounded' : 'text-slate-700 dark:text-slate-200'}`}>
                {value || '---'}
            </span>
        </div>
    )
}

function InputRow({ label, field, data, setData, editing }: any) {
    return (
        <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-700/50 pb-2 last:border-0 last:pb-0 h-10">
            <span className="text-sm text-slate-500 w-1/3">{label}</span>
            {editing ? (
                <input 
                    type="text" 
                    className="w-2/3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-right focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    value={data[field] || ''}
                    onChange={e => setData({...data, [field]: e.target.value})}
                    placeholder="---"
                />
            ) : (
                <span className="font-medium text-slate-700 dark:text-slate-200 text-right w-2/3 truncate">
                    {data[field] || '---'}
                </span>
            )}
        </div>
    )
}
