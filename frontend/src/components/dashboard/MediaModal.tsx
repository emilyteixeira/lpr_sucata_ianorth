import React from 'react';
import { X, Download } from 'lucide-react';
import { getMediaUrl } from '../../config';

interface Props {
    url: string;
    type: 'image' | 'video';
    onClose: () => void;
}

export function MediaModal({ url, type, onClose }: Props) {
    const BASE_URL = "http://127.0.0.1:8000";
    
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    const fullUrl = getMediaUrl(url);

    console.log(" Tentando abrir mídia:", fullUrl);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-5xl w-full overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                    <h3 className="font-semibold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                        {type === 'image' ? 'Registro Fotográfico' : 'Replay do Evento'}
                    </h3>
                    <div className="flex gap-2">
                        <a 
                            href={fullUrl} 
                            download 
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500" 
                            title="Baixar ou Abrir Nova Aba"
                        >
                            <Download size={20}/>
                        </a>
                        <button onClick={onClose} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-500 hover:text-red-500 rounded-lg transition-colors">
                            <X size={20}/>
                        </button>
                    </div>
                </div>

                <div className="bg-black flex items-center justify-center flex-1 overflow-hidden relative">
                    {type === 'image' ? (
                        <img 
                            src={fullUrl} 
                            alt="Evento LPR" 
                            className="max-h-full max-w-full object-contain"
                            onError={(e) => console.error(" Erro ao carregar imagem:", fullUrl)}
                        />
                    ) : (
                        <video 
                            controls 
                            autoPlay 
                            className="max-h-full max-w-full outline-none"
                            onError={(e) => console.error("Erro ao carregar vídeo:", fullUrl)}
                        >
                            <source src={fullUrl} type="video/mp4" />
                            Seu navegador não suporta vídeos.
                        </video>
                    )}
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500 text-center border-t border-slate-200 dark:border-slate-700">
                    Arquivo: {url} • Servidor IANorth
                </div>
            </div>
        </div>
    );
}
