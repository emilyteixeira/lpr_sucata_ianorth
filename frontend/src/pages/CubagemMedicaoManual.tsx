import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Eraser, Save, Trash2, Undo2 } from "lucide-react";

import {
    cubagemRawStreamUrl,
    cubagemSnapshotUrl,
    fetchCalibration,
    saveManualMeasurement,
} from "../api/cubagem";
import {
    MeasurementCanvas,
    type MeasurementLine,
} from "../components/cubagem/MeasurementCanvas";
import { API_BASE_URL } from "../config";
import type { HomographyCalibration } from "../types";

type MeasurementMode = "comprimento" | "largura" | "altura";

type LocationState = {
    returnTo?: string;
    eventoId?: number;
};

const MODE_COLORS: Record<MeasurementMode, string> = {
    comprimento: "#16a34a",
    largura: "#f97316",
    altura: "#2563eb",
};

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

export function CubagemMedicaoManual() {
    const { placa } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const routeState = location.state as LocationState | null;
    const [mode, setMode] = useState<MeasurementMode>("comprimento");
    const [placaInput, setPlacaInput] = useState(placa || "");
    const [calibration, setCalibration] = useState<HomographyCalibration | null>(null);
    const [imageSrc, setImageSrc] = useState(cubagemRawStreamUrl());
    const [frozen, setFrozen] = useState(false);
    const [lines, setLines] = useState<MeasurementLine[]>([]);
    const [values, setValues] = useState({
        comprimento: "",
        largura: "",
        altura: "",
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchCalibration()
            .then(setCalibration)
            .catch((error) => console.error(error));
    }, []);

    const volumePreview = useMemo(() => {
        const c = Number(values.comprimento) || 0;
        const l = Number(values.largura) || 0;
        const a = Number(values.altura) || 0;
        return c > 0 && l > 0 && a > 0 ? c * l * a : 0;
    }, [values]);

    return (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                    {(
                        [
                            ["comprimento", "Comprimento"],
                            ["largura", "Largura"],
                            ["altura", "Altura"],
                        ] as [MeasurementMode, string][]
                    ).map(([key, label]) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setMode(key)}
                            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                                mode === key
                                    ? "text-white shadow-sm"
                                    : "border border-light-border bg-light-surface text-slate-600 dark:border-dark-border dark:bg-dark-surface dark:text-slate-300"
                            }`}
                            style={mode === key ? { backgroundColor: MODE_COLORS[key] } : undefined}
                        >
                            {label}
                        </button>
                    ))}

                    <button
                        type="button"
                        onClick={() => {
                            if (frozen) {
                                setImageSrc(cubagemRawStreamUrl());
                                setFrozen(false);
                            } else {
                                setImageSrc(cubagemSnapshotUrl());
                                setFrozen(true);
                            }
                        }}
                        className="rounded-xl border border-light-border bg-light-surface px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-dark-border dark:bg-dark-surface dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                        {frozen ? "Voltar ao vivo" : "Congelar"}
                    </button>
                </div>

                <MeasurementCanvas
                    imageSrc={imageSrc}
                    mode={mode}
                    strokeColor={MODE_COLORS[mode]}
                    lines={lines}
                    onAddLine={({ start, end }) => {
                        const meters = distanceFromHomography(start, end, calibration?.matriz || null);
                        const pixels = Math.hypot(end.x - start.x, end.y - start.y);
                        const line: MeasurementLine = {
                            id: `${mode}-${Date.now()}`,
                            mode,
                            color: MODE_COLORS[mode],
                            start,
                            end,
                            label: meters != null ? `${meters.toFixed(2)} m` : `${pixels.toFixed(0)} px`,
                        };

                        setLines((current) => [
                            ...current.filter((item) => item.mode !== mode),
                            line,
                        ]);

                        if (meters != null) {
                            setValues((current) => ({
                                ...current,
                                [mode]: meters.toFixed(2),
                            }));
                        }
                    }}
                />
            </div>

            <div className="space-y-5">
                <div className="rounded-xl border border-light-border bg-light-surface p-5 shadow-sm dark:border-dark-border dark:bg-dark-surface">
                    <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
                        Medição manual
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                                Placa
                            </label>
                            <input
                                value={placaInput}
                                onChange={(event) => setPlacaInput(event.target.value.toUpperCase())}
                                className="w-full rounded-xl border border-light-border bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-dark-border dark:bg-slate-900 dark:text-white"
                                placeholder="ABC1D23"
                            />
                        </div>

                        {(
                            [
                                ["comprimento", "Comprimento (m)"],
                                ["largura", "Largura (m)"],
                                ["altura", "Altura (m)"],
                            ] as [MeasurementMode, string][]
                        ).map(([key, label]) => (
                            <div key={key}>
                                <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                                    {label}
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={values[key]}
                                    onChange={(event) =>
                                        setValues((current) => ({
                                            ...current,
                                            [key]: event.target.value,
                                        }))
                                    }
                                    className="w-full rounded-xl border border-light-border bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-dark-border dark:bg-slate-900 dark:text-white"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-xl border border-light-border bg-light-surface p-5 shadow-sm dark:border-dark-border dark:bg-dark-surface">
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                        Volume prévio
                    </h3>
                    <p className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
                        {volumePreview > 0 ? `${volumePreview.toFixed(2)} m³` : "--"}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                        Comprimento e largura usam a homografia quando disponível. A altura pode ser ajustada manualmente.
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => {
                            setLines((current) => current.filter((line) => line.mode !== mode));
                            setValues((current) => ({ ...current, [mode]: "" }));
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-light-border bg-light-surface px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-dark-border dark:bg-dark-surface dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                        <Undo2 size={16} />
                        Desfazer
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setLines([]);
                            setValues({ comprimento: "", largura: "", altura: "" });
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-light-border bg-light-surface px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-dark-border dark:bg-dark-surface dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                        <Eraser size={16} />
                        Limpar
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300"
                    >
                        <Trash2 size={16} />
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={async () => {
                            const comprimento_m = Number(values.comprimento);
                            const largura_m = Number(values.largura);
                            const altura_m = Number(values.altura);

                            if (!placaInput.trim()) {
                                alert("Informe a placa antes de salvar.");
                                return;
                            }
                            if (comprimento_m <= 0 || largura_m <= 0 || altura_m <= 0) {
                                alert("Preencha comprimento, largura e altura com valores válidos.");
                                return;
                            }

                            setSaving(true);
                            try {
                                await saveManualMeasurement({
                                    placa: placaInput.trim().toUpperCase(),
                                    comprimento_m,
                                    largura_m,
                                    altura_m,
                                });
                                if (routeState?.eventoId) {
                                    const response = await fetch(`${API_BASE_URL}/eventos/${routeState.eventoId}`, {
                                        method: "PUT",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                            dim_comprimento: comprimento_m,
                                            dim_largura: largura_m,
                                            dim_altura: altura_m,
                                        }),
                                    });
                                    if (!response.ok) {
                                        throw new Error("Falha ao atualizar o ticket com a medição manual.");
                                    }
                                }
                                alert("Medição manual salva com sucesso.");
                                const returnTo = routeState?.returnTo;
                                if (returnTo) {
                                    navigate(returnTo);
                                } else {
                                    navigate(-1);
                                }
                            } catch (error) {
                                console.error(error);
                                alert("Não foi possível salvar a medição manual.");
                            } finally {
                                setSaving(false);
                            }
                        }}
                        disabled={saving}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
                    >
                        <Save size={16} />
                        {saving ? "Salvando..." : "Salvar"}
                    </button>
                </div>
            </div>
        </div>
    );
}
