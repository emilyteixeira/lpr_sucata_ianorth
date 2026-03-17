import React, { useState, useEffect } from 'react';
import { Users as UsersIcon, Plus, Shield, ShieldAlert, Key, Ban, CheckCircle, X, Save } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface Usuario {
    id: number;
    nome: string;
    matricula: string;
    cpf: string;
    role: string;
    cargo: string;
    is_active: boolean;
}

export function Users() {
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [loading, setLoading] = useState(true);

    const [modalNovo, setModalNovo] = useState(false);
    const [modalSenha, setModalSenha] = useState<{aberto: boolean, userId: number | null, nome: string}>({aberto: false, userId: null, nome: ''});

    const [novoUser, setNovoUser] = useState({ nome: '', matricula: '', cpf: '', password: '', role: 'classificador', cargo: '' });
    const [novaSenha, setNovaSenha] = useState('');

    const carregarUsuarios = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/usuarios`);
            if (res.ok) setUsuarios(await res.json());
        } catch (e) { console.error("Erro ao carregar equipe", e); } 
        finally { setLoading(false); }
    };

    useEffect(() => { carregarUsuarios(); }, []);

    const handleCriarUsuario = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_BASE_URL}/api/usuarios`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(novoUser)
            });
            if (res.ok) {
                setModalNovo(false);
                setNovoUser({ nome: '', matricula: '', cpf: '', password: '', role: 'classificador', cargo: '' });
                carregarUsuarios();
            } else alert("Erro: A matrícula ou CPF já existem!");
        } catch (e) { alert("Falha na comunicação com o servidor."); }
    };

    const handleToggleStatus = async (id: number) => {
        if(!confirm("Tem a certeza que deseja alterar o acesso deste utilizador?")) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/usuarios/${id}/status`, { method: 'PUT' });
            if (res.ok) carregarUsuarios();
        } catch (e) { console.error(e); }
    };

    const handleResetSenha = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_BASE_URL}/api/usuarios/${modalSenha.userId}/reset-senha`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nova_senha: novaSenha })
            });
            if (res.ok) {
                alert("Senha alterada com sucesso!");
                setModalSenha({aberto: false, userId: null, nome: ''});
                setNovaSenha('');
            }
        } catch (e) { alert("Erro ao alterar Senha."); }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto animate-fade-in">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <UsersIcon className="text-blue-600" /> Gestão da Equipe
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Adicione classificadores, altere acessos e faça a gestão de senhas.</p>
                </div>
                <button onClick={() => setModalNovo(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition shadow-sm">
                    <Plus size={18} /> Novo Utilizador
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                            <th className="p-4 font-bold">Nome</th>
                            <th className="p-4 font-bold">Matrícula / CPF</th>
                            <th className="p-4 font-bold text-center">Nível</th>
                            <th className="p-4 font-bold text-center">Status</th>
                            <th className="p-4 font-bold text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-sm">
                        {loading ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-500">A carregar equipe...</td></tr>
                        ) : usuarios.map(u => (
                                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                                    <td className="p-4 font-bold text-slate-800 dark:text-slate-200">{u.nome}
                                        <span className="block text-[10px] font-normal text-slate-500">{u.cargo}</span>
                                    </td>
                                    <td className="p-4 text-slate-600 dark:text-slate-400 font-mono">
                                        <span className="block">{u.matricula}</span>
                                        {u.cpf && <span className="text-[10px] text-slate-400">{u.cpf}</span>}
                                    </td>
                                    <td className="p-4 text-center">
                                        {u.role === 'admin' 
                                            ? <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-2 py-1 rounded text-xs font-bold"><Shield size={12}/> Admin</span>
                                            : <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 px-2 py-1 rounded text-xs font-bold">Classificador</span>
                                        }
                                    </td>
                                    <td className="p-4 text-center">
                                        {u.is_active 
                                            ? <span className="text-green-600 dark:text-green-400 flex items-center justify-center gap-1 font-bold text-xs"><CheckCircle size={14}/> Ativo</span>
                                            : <span className="text-red-500 flex items-center justify-center gap-1 font-bold text-xs"><ShieldAlert size={14}/> Bloqueado</span>
                                        }
                                    </td>
                                    <td className="p-4 flex items-center justify-end gap-2">
                                        <button onClick={() => setModalSenha({aberto: true, userId: u.id, nome: u.nome})} className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-900/30 rounded transition" title="Redefinir Palavra-passe"><Key size={16}/></button>
                                        {u.matricula !== 'admin' && (
                                            <button onClick={() => handleToggleStatus(u.id)} className={`p-2 rounded transition ${u.is_active ? 'text-slate-400 hover:text-red-600 bg-slate-100 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-900/30' : 'text-red-500 bg-red-50 hover:bg-green-50 hover:text-green-600 dark:bg-red-900/20 dark:hover:bg-green-900/30'}`} title={u.is_active ? "Bloquear Acesso" : "Desbloquear Acesso"}><Ban size={16}/></button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>

            {modalNovo && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-slide-up">
                        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                            <h3 className="font-bold text-slate-800 dark:text-white">Adicionar Utilizador</h3>
                            <button onClick={() => setModalNovo(false)} className="text-slate-400 hover:text-red-500"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleCriarUsuario} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo *</label>
                                <input type="text" required value={novoUser.nome} onChange={e => setNovoUser({...novoUser, nome: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"/>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Matrícula *</label>
                                    <input type="text" required value={novoUser.matricula} onChange={e => setNovoUser({...novoUser, matricula: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"/>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">CPF (Opcional)</label>
                                    <input type="text" value={novoUser.cpf} onChange={e => setNovoUser({...novoUser, cpf: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" placeholder="000.000.000-00"/>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Palavra-Passe *</label>
                                    <input type="text" required value={novoUser.password} onChange={e => setNovoUser({...novoUser, password: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" placeholder="Senha inicial"/>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nível de Acesso</label>
                                    <select value={novoUser.role} onChange={e => setNovoUser({...novoUser, role: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white">
                                        <option value="classificador">Classificador (Padrão)</option>
                                        <option value="admin">Administrador (Gestão)</option>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cargo / Função *</label>
                                            <input 
                                                type="text" 
                                                required
                                                value={novoUser.cargo} 
                                                onChange={e => setNovoUser({...novoUser, cargo: e.target.value})} 
                                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" 
                                                placeholder="Ex: Operador de Máquinas"
                                            />
                                        </div>
                                    </select>
                                </div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setModalNovo(false)} className="flex-1 py-2.5 rounded-lg font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition">Cancelar</button>
                                <button type="submit" className="flex-1 py-2.5 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2 transition"><Save size={18}/> Salvar Utilizador</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {modalSenha.aberto && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-slide-up">
                        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 bg-yellow-50 dark:bg-yellow-900/20">
                            <h3 className="font-bold text-yellow-800 dark:text-yellow-500 flex items-center gap-2"><Key size={18}/> Resetar Palavra-Passe</h3>
                            <button onClick={() => setModalSenha({aberto: false, userId: null, nome: ''})} className="text-slate-400 hover:text-red-500"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleResetSenha} className="p-6 space-y-4">
                            <p className="text-sm text-slate-600 dark:text-slate-400">Defina uma nova senha para <b>{modalSenha.nome}</b>:</p>
                            <input type="text" required autoFocus value={novaSenha} onChange={e => setNovaSenha(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-yellow-500 dark:text-white" placeholder="Nova palavra-passe"/>
                            <button type="submit" className="w-full py-2.5 rounded-lg font-bold text-white bg-yellow-600 hover:bg-yellow-700 transition mt-2">Atualizar Credenciais</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
