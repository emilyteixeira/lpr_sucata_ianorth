import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { API_BASE_URL } from '../../config';

interface ManualSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ManualSearchModal({ isOpen, onClose }: ManualSearchModalProps) {
    const [termoBusca, setTermoBusca] = useState('');
    const [buscando, setBuscando] = useState(false);

    
    if (!isOpen) return null;

    const handleBuscaManual = async (e: React.FormEvent) => {
        e.preventDefault();
        setBuscando(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/eventos/busca-manual`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ parametro: termoBusca })
            });
            if (res.ok) {
                setTermoBusca('');
                onClose(); // Fecha o modal após o sucesso
                // O Dashboard já atualiza a cada 2.5s, o ticket vai aparecer automaticamente!
            } else {
                alert("Placa ou Ticket não encontrado na Sinobras no dia de hoje.");
            }
        } catch (e) {
            alert("Erro de comunicação com o servidor.");
        } finally {
            setBuscando(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-slide-up">
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Search size={18} className="text-blue-600"/> Buscar Ticket
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors">
                        <X size={20}/>
                    </button>
                </div>
                <form onSubmit={handleBuscaManual} className="p-6">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                        Digite a Placa (ou Ticket) da carreta que não foi lida pela câmera LPR:
                    </p>
                    <input 
                        type="text" 
                        required 
                        autoFocus
                        value={termoBusca} 
                        onChange={e => setTermoBusca(e.target.value)} 
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white mb-4 uppercase placeholder-slate-400" 
                        placeholder="Ex: ABC1234"
                    />
                    <button 
                        type="submit" 
                        disabled={buscando}
                        className="w-full py-3 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 transition disabled:opacity-50 flex justify-center items-center gap-2"
                    >
                        {buscando ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Buscando na Sinobras...
                            </>
                        ) : 'Importar para o CCO'}
                    </button>
                </form>
            </div>
        </div>
    );
}