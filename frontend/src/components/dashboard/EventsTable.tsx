import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Scale, FileText, Camera, PlayCircle } from 'lucide-react';
import type { EventoLPR } from '../../types';

interface Props {
    eventos: EventoLPR[];
    onViewImage: (url: string) => void;
    onViewVideo: (url: string) => void;
}

export function EventsTable({ eventos, onViewImage, onViewVideo }: Props) {
    const navigate = useNavigate();
  
  if (eventos.length > 0) {
      console.log(" Último evento recebido:", eventos[0]);
      console.log(" URL da Foto do último:", eventos[0].snapshot_url);
  }

  return (
    <div className="bg-light-surface dark:bg-dark-surface rounded-xl border border-light-border dark:border-dark-border shadow-sm overflow-hidden">
      <div className="p-4 border-b border-light-border dark:border-dark-border flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
          <h3 className="font-semibold text-slate-700 dark:text-slate-200">Últimos Veículos</h3>
          <span className="text-xs text-slate-500">Atualizado em tempo real</span>
      </div>

      <table className="w-full text-left border-collapse">
        <thead className="bg-slate-50 dark:bg-dark-bg text-slate-500 dark:text-slate-400 text-xs uppercase font-bold tracking-wider">
          <tr>
            <th className="p-4">Horário</th>
            <th className="p-4">Veículo</th>
            <th className="p-4">Carga</th>
            <th className="p-4 text-right">Pesagem (Kg)</th>
            <th className="p-4 text-center">Mídia</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
          {eventos.map((evt) => (
            <tr key={evt.id} 
                className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                onClick={() => navigate(`/ticket/${evt.id}`)}
            >
              
              <td className="p-4 align-top">
                <div className="font-mono text-slate-700 dark:text-slate-300 font-medium">
                  {evt.timestamp_registro?.split(' ')[1] || '--:--'}
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold mt-1 uppercase ${
                    evt.status_ticket === 'ABERTO' 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                    {evt.status_ticket || 'PENDENTE'}
                </span>
              </td>

              <td className="p-4 align-top">
                <div className="flex items-center gap-2">
                    <span className="bg-slate-900 text-yellow-500 font-mono font-bold px-2 py-1 rounded border border-slate-600 shadow-sm text-sm">
                        {evt.placa_veiculo}
                    </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500 mt-1.5 font-mono">
                    <FileText size={12}/> #{evt.ticket_id}
                </div>
              </td>

              <td className="p-4 align-top">
                <div className="font-medium text-slate-700 dark:text-slate-200">{evt.fornecedor_nome}</div>
                <div className="text-xs text-primary-600 dark:text-primary-400 font-bold mt-1 uppercase tracking-wide">
                    {evt.produto_declarado}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">NF: {evt.nota_fiscal}</div>
              </td>

              <td className="p-4 text-right align-top">
                <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <span>NF:</span>
                        <span className="font-mono">{evt.peso_nf?.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm font-bold text-slate-700 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        <Scale size={14} className="text-slate-400"/>
                        <span className="font-mono">{evt.peso_balanca?.toLocaleString()}</span>
                    </div>
                </div>
              </td>

              <td className="p-4 align-middle text-center">
                 <div className="flex justify-center gap-2">
                    
                    {evt.snapshot_url ? (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onViewImage(evt.snapshot_url!)
                            }}
                            className="p-2 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-primary-500 hover:text-white dark:hover:bg-primary-500 transition-all text-slate-500 dark:text-slate-400 shadow-sm" 
                            title="Ver Foto"
                        >
                            <Camera size={18}/>
                        </button>
                    ) : (
                        <span className="w-[34px]"></span>
                    )}
                    
                    {evt.video_url ? (
                         <button 
                            onClick={(e) => { 
                                e.stopPropagation();
                                onViewVideo(evt.video_url!)
                            }}
                            className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white transition-all shadow-sm" 
                            title="Ver Replay"
                        >
                            <PlayCircle size={18}/>
                        </button>
                    ) : (
                        <span className="w-[34px]"></span>
                    )}
                 </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
