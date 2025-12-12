
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon, Truck, BarChart3, Settings, LogOut, LayoutDashboard } from 'lucide-react';

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="flex h-screen w-full bg-light-bg dark:bg-dark-bg text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
      
      <aside className="w-64 flex-shrink-0 bg-light-surface dark:bg-dark-surface border-r border-light-border dark:border-dark-border hidden md:flex flex-col shadow-lg z-10">
        <div className="h-16 flex items-center gap-3 px-6 border-b border-light-border dark:border-dark-border">
                       <span className="font-bold text-xl tracking-tight text-slate-800 dark:text-white">IANorth</span>
        </div>

        <nav className="flex-1 px-3 space-y-1 mt-6">
            <NavItem 
                icon={<LayoutDashboard size={20}/>} 
                label="Dashboard" 
                active={location.pathname === '/'}
                onClick={() => navigate('/')}   
            />
            
            <NavItem 
                icon={<Truck size={20}/>} 
                label="Histórico LPR" 
                active={location.pathname === '/history'} 
                onClick={() => navigate('/history')}    
            />
            
            <NavItem icon={<BarChart3 size={20}/>} label="Relatórios" />
            
            <div className="pt-4 mt-4 border-t border-light-border dark:border-dark-border">
                <NavItem 
                            icon={<Settings size={20}/>} 
                            label="Configurações"
                            active={location.pathname === '/settings'}
                            onClick={() => navigate('/settings')}
                />
            </div>
        </nav>

        <div className="p-4">
            <button className="flex items-center gap-3 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all w-full px-4 py-3 rounded-lg font-medium">
                <LogOut size={20} />
                <span>Desconectar</span>
            </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        
        <header className="h-16 flex items-center justify-between px-8 bg-light-surface/80 dark:bg-dark-surface/80 backdrop-blur-md border-b border-light-border dark:border-dark-border sticky top-0 z-20">
            <div className="flex items-center gap-4">
                <h2 className="font-semibold text-lg text-slate-700 dark:text-slate-200">
                    {location.pathname === '/history' ? 'Histórico de Registros' : 'Classificação de Sucata'}
                </h2>
                <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs px-2 py-1 rounded-full border border-green-200 dark:border-green-800 animate-pulse">
                    ● Sistema Online
                </span>
            </div>
            
            <button 
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-yellow-400 border border-transparent hover:border-light-border dark:hover:border-dark-border"
                title="Alternar Tema"
            >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
        </header>

        <main className="flex-1 overflow-auto p-6 scroll-smooth">
            <div className="max-w-7xl mx-auto">
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
    onClick?: () => void; 
}

function NavItem({ icon, label, active = false, onClick }: NavItemProps) {
    return (
        <button 
            onClick={onClick} 
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-all duration-200 group ${
            active 
            ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400 font-semibold border-l-4 border-primary-500' 
            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-slate-200'
        }`}>
            {icon}
            <span className="">{label}</span>
        </button>
    )
}
