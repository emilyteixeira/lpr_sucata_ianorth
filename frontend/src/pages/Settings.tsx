import React, { useState, useEffect } from 'react';
import { Save, Camera, ShieldCheck, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../config'; 

export function Settings() {
  const [ip, setIp] = useState('');
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [active, setActive] = useState(true);
  
  const [msg, setMsg] = useState<{type: 'success'|'error', text: string} | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/config/camera`)
      .then(res => res.json())
      .then(data => {
        if(data.ip_address) {
            setIp(data.ip_address);
            setUser(data.username);
            setPass(data.password);
            setActive(data.is_active);
        }
      })
      .catch(e => console.error("Erro ao carregar configs:", e));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
        const res = await fetch(`${API_BASE_URL}/config/camera`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                ip_address: ip,
                username: user,
                password: pass,
                is_active: active
            })
        });

        if (res.ok) {
            setMsg({type: 'success', text: 'Configuração salva! O sistema está reconectando...'});
        } else {
            setMsg({type: 'error', text: 'Erro ao salvar.'});
        }
    } catch (err) {
        setMsg({type: 'error', text: 'Erro de conexão com o servidor.'});
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <div className="bg-light-surface dark:bg-dark-surface p-8 rounded-xl border border-light-border dark:border-dark-border shadow-sm">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-6">
                <SettingsIcon /> Configuração da Câmera LPR
            </h1>

            {msg && (
                <div className={`p-4 rounded-lg mb-6 flex items-center gap-2 ${msg.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {msg.type === 'success' ? <ShieldCheck size={20}/> : <AlertCircle size={20}/>}
                    {msg.text}
                </div>
            )}

            <form onSubmit={handleSave} className="space-y-6">
                
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        IP da Câmera (e Porta)
                    </label>
                    <div className="relative">
                        <Camera className="absolute left-3 top-3 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Ex: 192.168.1.16 ou 170.233.150.111:8898"
                            className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                            value={ip}
                            onChange={e => setIp(e.target.value)}
                            required
                        />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Insira o IP local se estiver no servidor, ou IP externo se estiver remoto.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Usuário</label>
                        <input 
                            type="text" 
                            className="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                            value={user}
                            onChange={e => setUser(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Senha</label>
                        <input 
                            type="password" 
                            className="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                            value={pass}
                            onChange={e => setPass(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <input 
                        type="checkbox" 
                        id="active"
                        checked={active}
                        onChange={e => setActive(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="active" className="text-sm text-slate-700 dark:text-slate-300">Ativar conexão automática</label>
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                    {loading ? 'Salvando...' : <><Save size={20} /> Salvar e Reconectar</>}
                </button>

            </form>
        </div>
    </div>
  );
}

function SettingsIcon() { return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg> }
