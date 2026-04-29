import React, { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, RotateCcw } from "lucide-react";

import { fetchCalibration, saveCalibration } from "../api/cubagem";
import type { HomographyCalibration } from "../types";

const INSTRUCOES = [
    "Clique no canto superior-esquerdo da caçamba",
    "Clique no canto superior-direito da caçamba",
    "Clique no canto inferior-direito da caçamba",
    "Clique no canto inferior-esquerdo da caçamba",
];

export function CubagemCalibracao() {
    const [calibration, setCalibration] = useState<HomographyCalibration | null>(null);
    const [points, setPoints] = useState<[number, number][]>([]);
    const [largura, setLargura] = useState("6.0");
    const [altura, setAltura] = useState("2.5");
    const [saving, setSaving] = useState(false);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        fetchCalibration()
            .then(setCalibration)
            .catch((error) => console.error(error));
    }, []);

    const frameSrc = useMemo(() => {
        if (!calibration?.frame_base64) {
            return null;
        }
        return `data:image/jpeg;base64,${calibration.frame_base64}`;
    }, [calibration]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const image = imageRef.current;
        if (!canvas || !image) {
            return;
        }

        const draw = () => {
            canvas.width = image.clientWidth;
            canvas.height = image.clientHeight;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                return;
            }
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const scaleX = image.clientWidth / (image.naturalWidth || 1);
            const scaleY = image.clientHeight / (image.naturalHeight || 1);

            points.forEach(([x, y], index) => {
                const px = x * scaleX;
                const py = y * scaleY;
                ctx.fillStyle = "#2563eb";
                ctx.beginPath();
                ctx.arc(px, py, 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#ffffff";
                ctx.font = "700 12px sans-serif";
                ctx.fillText(String(index + 1), px - 3, py + 4);
            });

            if (points.length > 1) {
                ctx.strokeStyle = "#60a5fa";
                ctx.lineWidth = 2;
                ctx.beginPath();
                points.forEach(([x, y], index) => {
                    const px = x * scaleX;
                    const py = y * scaleY;
                    if (index === 0) {
                        ctx.moveTo(px, py);
                    } else {
                        ctx.lineTo(px, py);
                    }
                });
                ctx.stroke();
            }
        };

        draw();
        window.addEventListener("resize", draw);
        return () => window.removeEventListener("resize", draw);
    }, [points, frameSrc]);

    return (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="rounded-xl border border-light-border bg-light-surface p-4 shadow-sm dark:border-dark-border dark:bg-dark-surface">
                <div className="mb-3 flex items-center justify-between">
                    <div>
                        <h2 className="text-sm font-semibold text-slate-800 dark:text-white">
                            Canvas de calibração
                        </h2>
                        <p className="text-xs text-slate-500">
                            {INSTRUCOES[Math.min(points.length, INSTRUCOES.length - 1)]}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setPoints([])}
                        className="inline-flex items-center gap-2 rounded-lg border border-light-border px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-dark-border dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                        <RotateCcw size={14} />
                        Reiniciar
                    </button>
                </div>

                <div
                    className="relative overflow-hidden rounded-xl border border-light-border bg-slate-950 dark:border-dark-border"
                    onClick={(event) => {
                        if (!imageRef.current || points.length >= 4) {
                            return;
                        }
                        const rect = imageRef.current.getBoundingClientRect();
                        const x = ((event.clientX - rect.left) / rect.width) * imageRef.current.naturalWidth;
                        const y = ((event.clientY - rect.top) / rect.height) * imageRef.current.naturalHeight;
                        setPoints((current) => [...current, [x, y]]);
                    }}
                >
                    {frameSrc ? (
                        <>
                            <img
                                ref={imageRef}
                                src={frameSrc}
                                alt="Frame de calibração"
                                className="h-full max-h-[620px] w-full object-contain"
                            />
                            <canvas
                                ref={canvasRef}
                                className="pointer-events-none absolute inset-0 h-full w-full"
                            />
                        </>
                    ) : (
                        <div className="flex h-[520px] items-center justify-center text-sm text-slate-400">
                            Aguardando frame do sidecar...
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-5">
                <div className="rounded-xl border border-light-border bg-light-surface p-5 shadow-sm dark:border-dark-border dark:bg-dark-surface">
                    <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
                        Parâmetros
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                                Largura (m)
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={largura}
                                onChange={(event) => setLargura(event.target.value)}
                                className="w-full rounded-xl border border-light-border bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-dark-border dark:bg-slate-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                                Altura (m)
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={altura}
                                onChange={(event) => setAltura(event.target.value)}
                                className="w-full rounded-xl border border-light-border bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-dark-border dark:bg-slate-900 dark:text-white"
                            />
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-light-border bg-light-surface p-5 shadow-sm dark:border-dark-border dark:bg-dark-surface">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
                        <CheckCircle2 size={16} className="text-emerald-500" />
                        Estado atual
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        Status: <strong>{calibration?.status || "ausente"}</strong>
                    </p>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                        Pontos marcados: <strong>{points.length}/4</strong>
                    </p>
                </div>

                <button
                    type="button"
                    onClick={async () => {
                        if (points.length !== 4) {
                            alert("Selecione exatamente 4 pontos antes de salvar.");
                            return;
                        }

                        setSaving(true);
                        try {
                            const result = await saveCalibration(
                                points,
                                Number(largura) || 6.0,
                                Number(altura) || 2.5,
                            );
                            alert("Calibração salva com sucesso.");
                            setCalibration((current) => ({
                                ...current,
                                ...(result as HomographyCalibration),
                            }));
                        } catch (error) {
                            console.error(error);
                            alert("Não foi possível salvar a calibração.");
                        } finally {
                            setSaving(false);
                        }
                    }}
                    disabled={saving}
                    className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
                >
                    {saving ? "Salvando..." : "Salvar calibração"}
                </button>
            </div>
        </div>
    );
}
