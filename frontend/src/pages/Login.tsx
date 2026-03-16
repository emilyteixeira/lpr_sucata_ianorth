import React, { useState, useContext } from 'react';
import { Lock, User, AlertCircle, ArrowRight } from 'lucide-react';
import { AuthContext } from '../../contexts/AuthContext';

export function Login() {
    const { login } = useContext(AuthContext);
    const [loginId, setLoginId] = useState('');
    const [password, setPassword] = useState('');
    const [erro, setErro] = useState('');
    const [carregando, setCarregando] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setErro('');
        setCarregando(true);
        try {
            await login(loginId, password);
        } catch (err) {
            setErro('Credenciais inválidas. Tente novamente.');
        } finally {
            setCarregando(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl flex overflow-hidden min-h-[500px]">
                
                <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center relative">
                    <div className="mb-8">
                        <img src="/sinobras-logo.png" alt="Sinobras Logo" className="h-12 mb-6" />
                        <h1 className="text-2xl font-extrabold text-slate-800">Sistema IANorth de Classificação de Sucata (SICS)</h1>
                        <p className="text-slate-500 text-sm mt-2">Insira as suas credenciais para aceder ao painel de controlo e auditoria de sucata.</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                        {erro && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center gap-2 text-sm font-bold border border-red-200">
                                <AlertCircle size={18} /> {erro}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Matricula ou CPF</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input 
                                    type="text" 
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                                    placeholder="Ex: 12345 ou 000.000.000-00"
                                    value={loginId}
                                    onChange={(e) => setLoginId(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Palavra-passe</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input 
                                    type="password" 
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={carregando}
                            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg py-3 flex items-center justify-center gap-2 transition-all disabled:opacity-70"
                        >
                            {carregando ? 'A Autenticar...' : 'Entrar no Sistema'} 
                            {!carregando && <ArrowRight size={18} />}
                        </button>
                    </form>

                    <div className="mt-8 text-center md:text-left">
                        <img src="/IanorthLog.png" alt="IANorth" className="h-6 mx-auto md:mx-0 opacity-60 grayscale hover:grayscale-0 transition-all" />
                    </div>
                </div>

                <div className="hidden md:block w-1/2 bg-blue-900 relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-900/90 to-slate-900/90 z-10" />
                    <img 
                        src="/caminhão2dSinobras.png" 
                        alt="Indústria" 
                        className="absolute inset-0 w-full h-full object-cover mix-blend-overlay"
                    />
                    <div className="absolute inset-0 z-20 flex flex-col justify-center p-12 text-white">
                        <h2 className="text-3xl font-bold mb-4 leading-tight">Inteligência na classificação de Metálicos</h2>
                        <p className="text-blue-100 opacity-80 leading-relaxed">
                            Auditoria visual, cálculo volumétrico inteligente e rastreabilidade total das cargas desde a balança até à garra.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
}
