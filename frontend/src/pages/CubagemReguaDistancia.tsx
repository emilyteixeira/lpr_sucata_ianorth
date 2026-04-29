import React, { useEffect, useState } from "react";
import { Info, Trash2 } from "lucide-react";

import { cubagemRawStreamUrl, fetchCalibration } from "../api/cubagem";
import {
    MeasurementCanvas,
    type MeasurementLine,
} from "../components/cubagem/MeasurementCanvas";
import type { HomographyCalibration } from "../types";

function distanceFromHomography(
    start: { x: number; y: number },
    end: { x: number; y: number },
    matrix: number[][] | null,
) {
    if (!matrix || matrix.length !== 3) {
        return null;
    }

    const project = (point: { x: number; y: number }) => {
        const [a, b, c] = matrix;
        const denom = c[0] * point.x + c[1] * point.y + c[2];
        if (!denom) {
            return null;
        }
        return {
            x: (a[0] * point.x + a[1] * point.y + a[2]) / denom,
            y: (b[0] * point.x + b[1] * point.y + b[2]) / denom,
        };
    };

    const p1 = project(start);
    const p2 = project(end);
    if (!p1 || !p2) {
        return null;
    }
    return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

export function CubagemReguaDistancia() {
    const [calibration, setCalibration] = useState<HomographyCalibration | null>(null);
    const [lines, setLines] = useState<MeasurementLine[]>([]);

    useEffect(() => {
        fetchCalibration()
            .then(setCalibration)
            .catch((error) => console.error(error));
    }, []);

    return (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <MeasurementCanvas
                imageSrc={cubagemRawStreamUrl()}
                mode="regua"
                strokeColor="#facc15"
                lines={lines}
                onAddLine={({ start, end }) => {
                    const meters = distanceFromHomography(start, end, calibration?.matriz || null);
                    const pixels = Math.hypot(end.x - start.x, end.y - start.y);
                    setLines((current) => [
                        {
                            id: `regua-${Date.now()}`,
                            mode: "regua",
                            color: "#facc15",
                            start,
                            end,
                            label: meters != null ? `${meters.toFixed(2)} m` : `${pixels.toFixed(0)} px`,
                        },
                        ...current,
                    ]);
                }}
            />

            <div className="space-y-5">
                <div className="rounded-xl border border-light-border bg-light-surface p-5 shadow-sm dark:border-dark-border dark:bg-dark-surface">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
                        <Info size={16} className="text-yellow-500" />
                        Régua de distância
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        Desenhe uma linha sobre a imagem para medir a distância. Se a homografia estiver indisponível, a régua mostra apenas pixels.
                    </p>
                    <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                        Calibração: {calibration?.matriz ? "ativa" : "ausente"}
                    </p>
                </div>

                <div className="rounded-xl border border-light-border bg-light-surface p-5 shadow-sm dark:border-dark-border dark:bg-dark-surface">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                            Leituras
                        </h3>
                        <button
                            type="button"
                            onClick={() => setLines([])}
                            className="inline-flex items-center gap-2 rounded-lg border border-light-border px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-dark-border dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                            <Trash2 size={14} />
                            Limpar
                        </button>
                    </div>

                    <div className="space-y-3">
                        {lines.length === 0 && (
                            <p className="text-sm text-slate-500">Nenhuma medição feita ainda.</p>
                        )}
                        {lines.map((line, index) => (
                            <div
                                key={line.id}
                                className="rounded-lg border border-light-border px-3 py-3 dark:border-dark-border"
                            >
                                <div className="text-xs uppercase tracking-wide text-slate-500">
                                    Linha {lines.length - index}
                                </div>
                                <div className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                                    {line.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
