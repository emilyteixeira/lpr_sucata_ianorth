import React, { useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext'; 
import { 
    Sun, Moon, LayoutDashboard, Menu, X, ChevronLeft, 
    BarChart3, Settings, LogOut, History, 
    UsersIcon,
    SettingsIcon
} from 'lucide-react';
import { AuthContext } from '../../../contexts/AuthContext';

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useContext(AuthContext); 
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen w-full bg-light-bg dark:bg-dark-bg text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
      
      <aside 
        className={`
            flex-shrink-0 bg-light-surface dark:bg-dark-surface border-r border-light-border dark:border-dark-border 
            flex flex-col shadow-lg z-20 transition-all duration-300 ease-in-out overflow-hidden
            ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full opacity-0 md:w-0 md:opacity-0'}
        `}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-light-border dark:border-dark-border">
            <span className="font-bold text-xl tracking-tight text-slate-800 dark:text-white whitespace-nowrap">IANorth</span>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden text-slate-500 hover:text-red-500 transition-colors">
                <X size={20}/>
            </button>
        </div>

            <nav className="flex-1 px-3 space-y-1 mt-6 overflow-y-auto">
            <NavItem 
                icon={<LayoutDashboard size={20}/>} 
                label="Dashboard" 
                active={location.pathname === '/'}
                onClick={() => navigate('/')}   
            />
            <NavItem 
                icon={<History size={20}/>} 
                label="Histórico" 
                active={location.pathname.includes('/history')}
                onClick={() => navigate('/history')}   
            />
            <NavItem 
                icon={<BarChart3 size={20}/>} 
                label="Relatórios" 
                active={location.pathname.includes('/relatorios')}
                onClick={() => navigate('/relatorios')}   
            />
            
            {/* MENUS EXCLUSIVOS PARA ADMIN */}
            {user?.role === 'admin' && (
                <>
                    <NavItem 
                        icon={<UsersIcon size={20}/>} 
                        label="Equipe / Usuários" 
                        active={location.pathname.includes('/admin/usuarios')}
                        onClick={() => navigate('/admin/usuarios')}   
                    />
                    <NavItem 
                        icon={<SettingsIcon size={20}/>} 
                        label="Config. Câmeras" 
                        active={location.pathname.includes('/settings')}
                        onClick={() => navigate('/settings')}   
                    />
                </>
            )}
        </nav>

        <div className="p-4 border-t border-light-border dark:border-dark-border">
            <button 
                onClick={logout} 
                className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
                <LogOut size={20} />
                <span className="font-medium">Sair</span>
            </button>
            <p className="text-[10px] text-center text-slate-400 dark:text-slate-600 font-mono mt-2">Desenvolvido por IANorth</p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 bg-light-surface dark:bg-dark-surface border-b border-light-border dark:border-dark-border flex items-center justify-between px-6 shadow-sm z-10">
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => setSidebarOpen(!isSidebarOpen)}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                    title={isSidebarOpen ? "Recolher Menu" : "Expandir Menu"}
                >
                    {isSidebarOpen ? <ChevronLeft size={24} /> : <Menu size={24} />}
                </button>

                <h2 className="text-lg font-semibold text-slate-700 dark:text-white hidden sm:block">
                    Sistema de Classificação
                </h2>
            </div>
            
            <div className="flex items-center gap-4">
                {/* NOME DO USUÁRIO LOGADO NO TOPO */}
                <div className="hidden md:flex flex-col items-end mr-2">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{user?.nome || 'Operador'}</span>
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{user?.cargo || 'Acesso Restrito'}</span>
                </div>

                <span className="hidden md:inline-block text-xs font-bold px-2 py-1 bg-green-100 text-green-700 rounded-full border border-green-200 animate-pulse">
                    ● Online
                </span>
                <button 
                    onClick={toggleTheme}
                    className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-yellow-400 border border-transparent hover:border-light-border dark:hover:border-dark-border"
                    title="Alternar Tema"
                >
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>
            </div>
        </header>

        <main className="flex-1 overflow-auto p-6 scroll-smooth bg-slate-50 dark:bg-[#0f172a]">
            <div className="max-w-7xl mx-auto h-full">
                {children}
            </div>
        </main>
      </div>
    </div>
  );
}

interface NavItemProps {
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    onClick: () => void; 
}

function NavItem({ icon, label, active = false, onClick }: NavItemProps) {
    return (
        <button 
            onClick={onClick} 
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-all duration-200 group whitespace-nowrap ${
            active 
            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' 
            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
            }`}
        >
            {icon}
            <span className="font-medium">{label}</span>
        </button>
    );
}
