import React from "react";

interface MaterialItem {
    tipo: string;
    pct: number;
    impureza: number;
}

interface TruckProps {
    materiais: MaterialItem[];
}

const COLORS = [
    'from-blue-600 to-blue-500', 
    'from-green-600 to-green-500', 
    'from-purple-600 to-purple-500', 
    'from-orange-600 to-orange-500',
    'from-yellow-500 to-yellow-400',
    'from-red-600 to-red-500',
];

export function TruckVisualizer({ materiais }: TruckProps) {
return (
        <div className="w-full flex flex-col items-center mt-4">
             <div className="w-full flex flex-wrap justify-center gap-3 text-[10px] font-bold text-slate-500 mb-2">
                {materiais.map((m, idx) => (
                    <div key={idx} className="flex items-center gap-1">
                        <div className={`w-3 h-3 rounded-sm bg-gradient-to-r ${COLORS[idx % COLORS.length]}`}></div>
                        {m.tipo || 'N/A'} ({m.pct}%)
                    </div>
                ))}
            </div>

            <div className="relative w-full max-w-lg h-64 border-b border-slate-200 dark:border-slate-700 mx-auto">
                
                <div className="absolute top-[65px] left-[40px] w-[350px] h-[100px] z-0 flex flex-col-reverse overflow-hidden rounded-sm opacity-90">
                    {materiais.map((m, idx) => (
                        <div 
                            key={idx}
                            className={`w-full bg-gradient-to-r ${COLORS[idx % COLORS.length]} transition-all duration-1000 border-t border-white/20`}
                            style={{ height: `${m.pct}%` }} 
                        >
                            <span className="sr-only">{m.tipo}: {m.pct}%</span>
                        </div>
                    ))}
                </div>

                <img 
                    src="/truckSinobras.png"
                    alt="Caminhão"
                    className="absolute inset-0 w-full h-full object-contain z-10 pointer-events-none"
                />
            </div>
        </div>
    );
}
