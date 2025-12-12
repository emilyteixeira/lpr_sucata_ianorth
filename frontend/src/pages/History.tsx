import React, { useState, useEffect } from 'react';
import { Calendar, Search, Filter, Download } from 'lucide-react';
import { EventsTable } from '../components/dashboard/EventsTable';
import { MediaModal } from '../components/dashboard/MediaModal';
import { API_BASE_URL } from '../config'; 
import type { EventoLPR } from '../types';

export function History() {
  const [eventos, setEventos] = useState<EventoLPR[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [busca, setBusca] = useState('');
  const [filtroData, setFiltroData] = useState('');

  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');

  useEffect(() => {
    fetch(`${API_BASE_URL}/eventos/`)
      .then(res => res.json())
      .then(data => {
        setEventos(data);
        setLoading(false);
      })
      .catch(err => console.error("Erro ao carregar histórico:", err));
  }, []);

  const eventosFiltrados = eventos.filter(evt => {
    const matchTexto = 
        evt.placa_veiculo.toLowerCase().includes(busca.toLowerCase()) ||
        evt.fornecedor_nome?.toLowerCase().includes(busca.toLowerCase()) ||
        evt.ticket_id?.toString().includes(busca);
    
    const matchData = filtroData ? evt.timestamp_registro.includes(filtroData) : true;

    return matchTexto && matchData;
  });

  const handleOpenImage = (url: string) => { setMediaUrl(url); setMediaType('image'); }
  const handleOpenVideo = (url: string) => { setMediaUrl(url); setMediaType('video'); }

  return (
    <div className="space-y-6 animate-fade-in">
      
      <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-xl border border-light-border dark:border-dark-border shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Calendar className="text-blue-500" /> Histórico de Entradas
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Pesquise por placa, ticket ou fornecedor.</p>
            </div>
            <button className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 px-4 py-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition">
                <Download size={18} /> Exportar CSV
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
                <Search className="absolute left-3 top-3 text-slate-400" size={20} />
                <input 
                    type="text" 
                    placeholder="Buscar Placa, Ticket..." 
                    className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                    value={busca}
                    onChange={e => setBusca(e.target.value)}
                />
            </div>

            <div className="relative">
                <input 
                    type="date" 
                    className="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white custom-date-input"
                    value={filtroData}
                    onChange={e => setFiltroData(e.target.value)}
                />
            </div>

            <div className="relative">
                <Filter className="absolute left-3 top-3 text-slate-400" size={20} />
                <select className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white appearance-none">
                    <option value="">Todos os Status</option>
                    <option value="ABERTO">Aberto</option>
                    <option value="FECHADO">Fechado</option>
                </select>
            </div>
        </div>
      </div>

      <div className="pb-10">
        <h3 className="text-lg font-semibold mb-4 ml-1 text-slate-700 dark:text-slate-300">
            {eventosFiltrados.length} registros encontrados
        </h3>
        
        <EventsTable 
            eventos={eventosFiltrados} 
            onViewImage={handleOpenImage} 
            onViewVideo={handleOpenVideo} 
        />
      </div>

      {mediaUrl && (
        <MediaModal url={mediaUrl} type={mediaType} onClose={() => setMediaUrl(null)} />
      )}
    </div>
  );
}
