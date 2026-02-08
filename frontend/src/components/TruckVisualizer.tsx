import React from "react";

interface TruckProps {
    volume: number;
    maxVolume: number;  // ex. 110 m3
    impurezaPct: number;
}

export function TruckVisualizer({ volume, maxVolume, impurezaPct }: TruckProps) {
    const fillPercentage = Math.min((volume / maxVolume) * 100, 100);

    const impurityHeight = fillPercentage * (impurezaPct / 100);
    const scrapHeight = fillPercentage - impurityHeight;

    return (
        <div className="w-full flex flex-col items-center">
            <div className="w-full flex justify-end gap-4 text-[10px] font-bold text-slate-500 mb-2">
                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-600 rounded-sm"></div>Sucata Limpa ({100 - impurezaPct}%)</span>
                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded-sm"></div> Impureza ({impurezaPct}%)</span>
            </div>
            
            <div className="relative w-full max-w-lg h-64 border-b border-slate-200 dark:border-slate-700">
                <div className="absolute bottom-[45px] left-[25px] right-[85px] h-[150px] flex flex-col-reverse justify-start overflow-hidden opacity-90 rounded-sm">
                    <div 
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-500 transition-all duration-1000 ease-out"
                        style={{ height: `${scrapHeight}%` }} 
                    ></div>
                    <div 
                        className="w-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-1000 ease-out"
                        style={{ height: `${impurityHeight}%` }}
                    ></div>
                </div>

                               <img 
                    src="/truckSinobras.png"
                    alt="Caminhão"
                    className="absolute inset-0 w-full h-full object-contain z-10 pointer-events-none mix-blend-multiply dark:mix-blend-normal"
                    onError={(e) => {
                        e.currentTarget.style.display = 'none';
                    }}
                />

                <div className="absolute top-4 right-10 z-20 bg-white/90 dark:bg-slate-800/90 backdrop-blur px-3 py-1 rounded-full border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm ">
                    {fillPercentage.toFixed(1)}% Ocupado
                </div>
            </div>
        </div>
    );
}
