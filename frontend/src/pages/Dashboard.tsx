import React, { useEffect, useState } from 'react';
import { Truck, CheckCircle, Clock, Weight } from 'lucide-react';
import { EventsTable } from '../components/dashboard/EventsTable';
import { MediaModal } from '../components/dashboard/MediaModal';
import type { EventoLPR } from '../types';
import { API_BASE_URL } from '../config';
import { useNavigate } from 'react-router-dom';

export function Dashboard() {
  const [eventos, setEventos] = useState<EventoLPR[]>([]);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const navigate = useNavigate();

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

  const todayDate = new Date().toISOString().split('T')[0]; 
  
  const finalizadosHoje = eventos.filter(e => e.status_ticket === 'Finalizado' && e.timestamp_registro.includes(todayDate)).length;
  const abertosHoje = eventos.filter(e => e.status_ticket !== 'Finalizado' && e.timestamp_registro.includes(todayDate)).length;

  let totalPesoLiquidoDia = 0;
  let totalImpurezaKgDia = 0;

  eventos.forEach(e => {
      if (e.status_ticket === 'Finalizado' && e.timestamp_registro.includes(todayDate)) {
          const pesoBruto = Number(e.peso_balanca) || 0;
          const pesoTara = Number(e.peso_tara) || 0;
          const pesoLiquido = Math.max(0, pesoBruto - pesoTara);
          
          const impurezaPct = Number(e.impureza_porcentagem) || 0;
          const impurezaKg = pesoLiquido * (impurezaPct / 100);
          
          totalPesoLiquidoDia += (pesoLiquido - impurezaKg);
          totalImpurezaKgDia += impurezaKg;
      }
  });

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div 
                onClick={() => navigate('/history?status=Finalizado')} 
                className="bg-light-surface dark:bg-dark-surface p-6 rounded-xl border border-light-border dark:border-dark-border shadow-sm flex justify-between items-start cursor-pointer hover:ring-2 hover:ring-blue-500 transition group"
            >
                <div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Finalizados (Hoje)</p>
                    <h3 className="text-3xl font-bold text-slate-800 dark:text-white mt-2">{finalizadosHoje}</h3>
                    <span className="inline-flex items-center text-xs font-bold mt-2 text-green-500 group-hover:underline">
                        Ver listagem completa
                    </span>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-900/30 text-green-600 rounded-lg"><CheckCircle size={24}/></div>
            </div>

            {/* Triagem  */}
            <div 
                onClick={() => navigate('/history?status=Aberto')} 
                className="bg-light-surface dark:bg-dark-surface p-6 rounded-xl border border-light-border dark:border-dark-border shadow-sm flex justify-between items-start cursor-pointer hover:ring-2 hover:ring-blue-500 transition group"
            >
                <div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Em Triagem (Hoje)</p>
                    <h3 className="text-3xl font-bold text-slate-800 dark:text-white mt-2">{abertosHoje}</h3>
                    <span className="inline-flex items-center text-xs font-bold mt-2 text-orange-500 group-hover:underline">
                        Ver tickets em aberto
                    </span>
                </div>
                <div className="p-3 bg-orange-50 dark:bg-orange-900/30 text-orange-600 rounded-lg"><Clock size={24}/></div>
            </div>

            {/* Pesos do Dia */}
            <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-xl border border-light-border dark:border-dark-border shadow-sm flex justify-between items-start">
                <div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Sucata Líquida (Hoje)</p>
                    <h3 className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1 tracking-tight">
                        {totalPesoLiquidoDia.toLocaleString(undefined, {maximumFractionDigits: 0})} <span className="text-sm font-normal text-green-600/70 dark:text-green-400/70">kg</span>
                    </h3>
                    
                    {/* Impureza */}
                    <div className="mt-2">
                        <span className="inline-flex items-center text-[11px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded border border-red-100 dark:border-red-800/50">
                            - {totalImpurezaKgDia.toLocaleString(undefined, {maximumFractionDigits: 0})} kg de Impurezas
                        </span>
                    </div>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-lg"><Weight size={24}/></div>
            </div>

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
