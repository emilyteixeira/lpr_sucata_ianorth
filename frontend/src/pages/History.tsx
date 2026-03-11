import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Calendar, Search, Filter, Download, ArrowDown, Database } from 'lucide-react';
import { EventsTable } from '../components/dashboard/EventsTable';
import { MediaModal } from '../components/dashboard/MediaModal';
import {exportarParaExcel} from '../../utils/excelGenerator'
import type { EventoLPR } from '../types';
import { API_BASE_URL } from '../config'; 

export function History() {
  const [searchParams] = useSearchParams();
  const [eventos, setEventos] = useState<EventoLPR[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [busca, setBusca] = useState('');
  const [filtroData, setFiltroData] = useState('');
  
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');

  const [mediaModal, setMediaModal] = useState<{url: string, type: 'image' | 'video'} | null>(null);

   const [exportando, setExportando] = useState(false);

  const fetchHistorico = async (termo = '') => {
    setLoading(true);
    try {
        let url = `${API_BASE_URL}/eventos/?limit=100`;
        if (termo) url += `&termo=${encodeURIComponent(termo)}`;
        
        const res = await fetch(url);
        const data = await res.json();
        setEventos(Array.isArray(data) ? data : []);
    } catch (err) {
        console.error("Erro ao carregar histórico:", err);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistorico();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchHistorico(busca);
    }, 600);
    return () => clearTimeout(delayDebounceFn);
  }, [busca]);

  const eventosExibidos = eventos.filter(evt => {
    const matchData = filtroData ? evt.timestamp_registro.includes(filtroData) : true;
    
    let matchStatus = true;
    if (statusFilter === 'Finalizado') {
        matchStatus = evt.status_ticket === 'Finalizado';
    } else if (statusFilter === 'Aberto') {
        matchStatus = evt.status_ticket !== 'Finalizado';
    }
    
    return matchData && matchStatus;
  });

    const handleExportarExcel = async () => {
        setExportando(true);
        await new Promise(resolve => setTimeout(resolve, 100));
        try {
            exportarParaExcel(eventosExibidos);
        } catch(e) {
            console.error("Erro no Excel:", e);
        } finally {
            setExportando(false);
        }
    }

  const handleViewImage = (url: string) => setMediaModal({ url, type: 'image' });
  const handleViewVideo = (url: string) => setMediaModal({ url, type: 'video' });

  return (
    <div className="p-6 max-w-[1600px] mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Database className="text-blue-600"/> Histórico de Operações
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Pesquisando em {eventos.length > 99 ? '+100' : eventos.length} registros
          </p>
        </div>
        
        <div className="flex gap-2">

                    <button 
                onClick={handleExportarExcel}
                disabled={eventosExibidos.length === 0 || exportando}
                className="flex items-center justify-center min-w-[160px] gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-bold transition dark:bg-slate-800 dark:text-slate-200 dark:border dark:border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed">
                {exportando ? (
                    <><div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div> Aguarde...</>
                ) : (
                    <><Download size={18}/> Exportar Excel</>
                )}
            </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 relative">
                <Search className="absolute left-3 top-3 text-slate-400" size={20} />
                <input 
                    type="text" placeholder="Buscar Ticket, Placa, Fornecedor..." 
                    className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white placeholder:text-slate-400"
                    value={busca} onChange={e => setBusca(e.target.value)}
                />
                {loading && <div className="absolute right-3 top-3"><div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>}
            </div>
            <div className="relative">
                <Calendar className="absolute left-3 top-3 text-slate-400" size={20} />
                <input 
                    type="date" className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                    value={filtroData} onChange={e => setFiltroData(e.target.value)}
                />
            </div>
            <div className="relative">
                <Filter className="absolute left-3 top-3 text-slate-400" size={20} />
                <select 
                    className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white appearance-none"
                    value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                >
                    <option value="">Todos os Status</option>
                    <option value="Aberto">Em Aberto</option>
                    <option value="Finalizado">Finalizados</option>
                </select>
                <ArrowDown className="absolute right-3 top-3 text-slate-400 pointer-events-none" size={16} />
            </div>
        </div>
      </div>

      <div className="pb-10">
        {!loading && eventosExibidos.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                <p className="text-slate-500 font-bold">Nenhum registro encontrado.</p>
            </div>
        ) : (
            <EventsTable 
                eventos={eventosExibidos} 
                onViewImage={handleViewImage} 
                onViewVideo={handleViewVideo} 
            />
        )}
      </div>

      {mediaModal && (
        <MediaModal 
            url={mediaModal.url} 
            type={mediaModal.type} 
            onClose={() => setMediaModal(null)} 
        />
      )}
    </div>
  );
}
