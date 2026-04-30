import React, { useLayoutEffect, useMemo, useRef, useState } from "react";


interface MaterialItem {
  tipo: string;
  peso: number;
  impureza: number;
}

interface TruckProps {
  materiais: MaterialItem[];
  mediaImpureza?: number;
}

const COLORS = [
  "from-blue-600 to-blue-500",
  "from-green-600 to-green-500",
  "from-purple-600 to-purple-500",
  "from-orange-600 to-orange-500",
  "from-yellow-500 to-yellow-400",
  "from-red-600 to-red-500",
];

export function TruckVisualizer({ materiais, mediaImpureza = 0}: TruckProps) {
  const normalized = useMemo(() => {
    const cleaned = materiais.map((m) => ({
      ...m,
      peso: Number.isFinite(m.peso) ? Math.max(0, m.peso) : 0,
    }));

    const total = cleaned.reduce((acc, m) => acc + m.peso, 0);

    let arr = cleaned.map((m) => ({
      ...m,
      pctNorm: total > 0 ? (m.peso / total) * 100 : 0,
    }));

    if (total > 0 && arr.length > 0) {
      const sum = arr.reduce((acc, m) => acc + m.pctNorm, 0);
      const diff = 100 - sum;
      arr = arr.map((m, i) =>
        i === arr.length - 1 ? { ...m, pctNorm: m.pctNorm + diff } : m
      );
    }

    return arr;
  }, [materiais]);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [bedStyle, setBedStyle] = useState<React.CSSProperties>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const img = imgRef.current;
    if (!wrap || !img) return;

    const compute = () => {
      const cw = wrap.clientWidth;
      const ch = wrap.clientHeight;

      const nw = img.naturalWidth || 1;
      const nh = img.naturalHeight || 1;

      const scale = Math.min(cw / nw, ch / nh);
      const drawnW = nw * scale;
      const drawnH = nh * scale;

      const offsetX = (cw - drawnW) / 2;
      const offsetY = (ch - drawnH) / 2;

      // left=270px, mas offsetX≈96px, então bedX deve dar 174px (270-96)
      // 174px / 480px (img renderizada) = 0.3625
      // Convertendo para % da imagem original: 0.3625
      const bedXPercent = 0.4800;  
      const bedYPercent = 0.1200;
      const bedWPercent = 0.4700;
      const bedHPercent = 0.3906;

      setBedStyle({
        left: offsetX + nw * bedXPercent * scale,
        top: offsetY + nh * bedYPercent * scale,
        width: nw * bedWPercent * scale,
        height: nh * bedHPercent * scale,
      });
    };

    const onLoad = () => compute();
    img.addEventListener("load", onLoad);

    if (img.complete) {
      compute();
    }

    const ro = new ResizeObserver(compute);
    ro.observe(wrap);

    return () => {
      img.removeEventListener("load", onLoad);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="w-full flex flex-col items-center mt-4">
      <div className="w-full flex flex-wrap justify-center gap-3 text-[10px] font-bold text-slate-500 mb-2">
        {normalized.map((m, idx) => (
          <div key={idx} className="flex items-center gap-1">
            <div
              className={`w-3 h-3 rounded-sm bg-gradient-to-r ${
                COLORS[idx % COLORS.length]
              }`}
            />
            {m.tipo || "N/A"} ({m.pctNorm.toFixed(1)}%)
          </div>
        ))}
      </div>

      <div
        ref={wrapRef}
        className="relative w-full max-w-2xl h-80 mx-auto"
      >
        <div
          className="absolute z-0 overflow-hidden opacity-90"
          style={{ ...bedStyle, 
		   borderRadius: "0 0 5px 5px",
		   clipPath:"polygon(0% 0%, 100% 20%, 100% 0%, 100% 80%, 0% 100%)"
		 }}
        >
          <div className="absolute inset-0 flex flex-col-reverse">
            {normalized.map((m, idx) => (
              <div
                key={idx}
                className={`w-full shrink-0 bg-gradient-to-r ${
                  COLORS[idx % COLORS.length]
                } transition-all duration-1000 border-t border-white/20`}
                style={{ height: `${m.pctNorm}%` }}
              />
            ))}
          </div>
        </div>

        <img
          ref={imgRef}
          src="/truckSinobras.png"
          alt="Caminhão"
          className="absolute inset-0 w-full h-full object-contain z-10 pointer-events-none"
        />

      </div>
    </div>
  );
}
