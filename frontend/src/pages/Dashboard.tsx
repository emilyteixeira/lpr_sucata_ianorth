import React, { useEffect, useState } from 'react';
import { Truck, Weight, ArrowUpRight } from 'lucide-react';
import { EventsTable } from '../components/dashboard/EventsTable';
import { MediaModal } from '../components/dashboard/MediaModal';
import type { EventoLPR } from '../types';
import { API_BASE_URL } from '../config';

export function Dashboard() {
  const [eventos, setEventos] = useState<EventoLPR[]>([]);
  
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');

  const fetchDados = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/eventos/`);
      if (res.ok) {
        const data = await res.json();
        setEventos(data);
      }
    } catch (e) { 
        console.error(e); 
    }
  };

  useEffect(() => {
    fetchDados();
    const interval = setInterval(fetchDados, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenImage = (url: string) => { setMediaUrl(url); setMediaType('image'); }
  const handleOpenVideo = (url: string) => { setMediaUrl(url); setMediaType('video'); }

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <KpiCard title="Veículos Hoje" value={eventos.length.toString()} icon={<Truck/>} change="+5%" />
            <KpiCard title="Alertas de Peso" value="2" icon={<Weight/>} change="-1" negative />
            <KpiCard title="Tickets Abertos" value={eventos.filter(e => e.status_ticket === 'ABERTO').length.toString()} icon={<ArrowUpRight/>} neutral />
        </div>

        <div className="flex justify-between items-center pt-4">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
                Monitoramento em Tempo Real
            </h3>
            <span className="text-xs text-slate-500">Atualizando a cada 2s</span>
        </div>
        
        <EventsTable 
            eventos={eventos} 
            onViewImage={handleOpenImage} 
            onViewVideo={handleOpenVideo}
        />

        {mediaUrl && (
            <MediaModal url={mediaUrl} type={mediaType} onClose={() => setMediaUrl(null)} />
        )}
    </div>
  );
}

function KpiCard({ title, value, icon, change, negative, neutral }: any) {
    return (
        <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-xl border border-light-border dark:border-dark-border shadow-sm flex justify-between items-start">
            <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{title}</p>
                <h3 className="text-3xl font-bold text-slate-800 dark:text-white mt-2">{value}</h3>
                {!neutral && (
                    <span className={`inline-flex items-center text-xs font-bold mt-2 ${negative ? 'text-red-500' : 'text-green-500'}`}>
                        {change} vs ontem
                    </span>
                )}
            </div>
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300">
                {icon}
            </div>
        </div>
    )
}
