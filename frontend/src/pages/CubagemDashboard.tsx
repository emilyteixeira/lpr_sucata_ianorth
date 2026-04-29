import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Camera, Gauge, Move3D, Ruler, Settings2 } from "lucide-react";

import { fetchCubagemState, triggerScreenshot, cubagemStreamUrl } from "../api/cubagem";
import { LiveStream } from "../components/cubagem/LiveStream";
import { getMediaUrl } from "../config";
import type { CubagemState, EventoLPR } from "../types";
import { API_BASE_URL } from "../config";

function formatStatus(state: CubagemState | null) {
    const status = state?.engine_status ?? "parado";
    if (status === "rodando") {
        return { label: "Ao vivo", classes: "bg-emerald-500 text-white" };
    }
    if (status === "iniciando") {
        return { label: "Iniciando", classes: "bg-amber-500 text-white" };
    }
    if (status === "erro") {
        return { label: "Sem sinal", classes: "bg-red-500 text-white" };
    }
    return { label: "Pausado", classes: "bg-slate-500 text-white" };
}

export function CubagemDashboard() {
    const navigate = useNavigate();
    const [state, setState] = useState<CubagemState | null>(null);
    const [eventos, setEventos] = useState<EventoLPR[]>([]);
    const [capturando, setCapturando] = useState(false);

    useEffect(() => {
        let ativo = true;

        const loadState = async () => {
            try {
                const data = await fetchCubagemState();
                if (ativo) {
                    setState(data);
                }
            } catch (error) {
                console.error(error);
            } finally {
                if (ativo) {
                    setTimeout(loadState, 1000);
                }
            }
        };

        loadState();
        return () => {
            ativo = false;
        };
    }, []);

    useEffect(() => {
        let ativo = true;

        const loadEventos = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/eventos/?limit=25`);
                if (!response.ok) {
                    return;
                }
                const data = (await response.json()) as EventoLPR[];
                if (ativo) {
                    setEventos(data);
                }
            } catch (error) {
                console.error(error);
            } finally {
                if (ativo) {
                    setTimeout(loadEventos, 4000);
                }
            }
        };

        loadEventos();
        return () => {
            ativo = false;
        };
    }, []);

    const eventosCubagem = useMemo(() => {
        return eventos
            .filter((evento) => evento.cubagem_m3 || evento.fotos_avaria?.includes("cubagem_"))
            .slice(0, 5);
    }, [eventos]);

    const fotosCubagem = useMemo(() => {
        return eventosCubagem
            .flatMap((evento) => (evento.fotos_avaria || "").split(",").filter(Boolean))
            .filter((foto) => foto.includes("cubagem_"))
            .slice(0, 8);
    }, [eventosCubagem]);

    const status = formatStatus(state);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <div className="xl:col-span-2">
                    <div className="relative">
                        <LiveStream src={cubagemStreamUrl()} title="Cubagem ao vivo" className="overflow-hidden" />
                        <span
                            className={`absolute left-4 top-16 rounded-full px-3 py-1 text-xs font-bold shadow-sm ${status.classes}`}
                        >
                            {status.label}
                        </span>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                        <button
                            type="button"
                            onClick={async () => {
                                setCapturando(true);
                                try {
                                    await triggerScreenshot();
                                    alert("Screenshot solicitado com sucesso.");
                                } catch (error) {
                                    console.error(error);
                                    alert("Não foi possível capturar o screenshot.");
                                } finally {
                                    setCapturando(false);
                                }
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
                            disabled={capturando}
                        >
                            <Camera size={16} />
                            {capturando ? "Capturando..." : "Capturar agora"}
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate("/cubagem/medicao")}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-light-border bg-light-surface px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 dark:border-dark-border dark:bg-dark-surface dark:text-slate-100 dark:hover:bg-slate-800"
                        >
                            <Move3D size={16} />
                            Medir manualmente
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate("/cubagem/calibracao")}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-light-border bg-light-surface px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 dark:border-dark-border dark:bg-dark-surface dark:text-slate-100 dark:hover:bg-slate-800"
                        >
                            <Settings2 size={16} />
                            Recalibrar
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    <div className="rounded-xl border border-light-border bg-light-surface p-5 shadow-sm dark:border-dark-border dark:bg-dark-surface">
                        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
                            <Gauge size={16} className="text-blue-600" />
                            Status
                        </div>
                        <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                            <div className="flex items-center justify-between">
                                <span>Modelo</span>
                                <strong>{state?.modelo_tipo || "---"}</strong>
                            </div>
                            <div className="flex items-center justify-between">
                                <span>FPS</span>
                                <strong>{state?.fps?.toFixed(1) || "0.0"}</strong>
                            </div>
                            <div className="flex items-center justify-between">
                                <span>Calibração</span>
                                <strong className="capitalize">{state?.calibracao_status || "ausente"}</strong>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-light-border bg-light-surface p-5 shadow-sm dark:border-dark-border dark:bg-dark-surface">
                        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
                            <Box size={16} className="text-emerald-600" />
                            Medição atual
                        </div>
                        <div className="space-y-3">
                            <div>
                                <p className="text-xs uppercase tracking-wide text-slate-500">Placa</p>
                                <p className="text-xl font-bold text-slate-900 dark:text-white">
                                    {state?.placa_atual || "SEM PLACA"}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-wide text-slate-500">Volume ao vivo</p>
                                <p className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
                                    {state?.volume_atual_m3 != null
                                        ? `${state.volume_atual_m3.toFixed(2)} m³`
                                        : "--"}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-light-border bg-light-surface p-5 shadow-sm dark:border-dark-border dark:bg-dark-surface">
                        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
                            <Ruler size={16} className="text-orange-500" />
                            Eventos recentes
                        </div>
                        <div className="space-y-3">
                            {eventosCubagem.length === 0 && (
                                <p className="text-sm text-slate-500">Nenhum evento de cubagem encontrado ainda.</p>
                            )}
                            {eventosCubagem.map((evento) => (
                                <button
                                    key={evento.id}
                                    type="button"
                                    onClick={() => navigate(`/ticket/${evento.id}`)}
                                    className="w-full rounded-lg border border-light-border px-3 py-3 text-left transition hover:bg-slate-50 dark:border-dark-border dark:hover:bg-slate-800"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <strong className="text-sm text-slate-900 dark:text-white">
                                            {evento.placa_veiculo}
                                        </strong>
                                        <span className="text-xs text-slate-500">{evento.timestamp_registro}</span>
                                    </div>
                                    <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                        {evento.cubagem_m3 != null
                                            ? `${evento.cubagem_m3.toFixed(2)} m³`
                                            : "Volume manual / pendente"}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-light-border bg-light-surface p-5 shadow-sm dark:border-dark-border dark:bg-dark-surface">
                <h3 className="mb-4 text-sm font-semibold text-slate-800 dark:text-white">
                    Evidências recentes da cubagem
                </h3>
                {fotosCubagem.length === 0 ? (
                    <p className="text-sm text-slate-500">Nenhuma evidência de cubagem disponível.</p>
                ) : (
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        {fotosCubagem.map((foto) => (
                            <a
                                key={foto}
                                href={getMediaUrl(foto)}
                                target="_blank"
                                rel="noreferrer"
                                className="overflow-hidden rounded-xl border border-light-border bg-slate-100 dark:border-dark-border dark:bg-slate-900"
                            >
                                <img
                                    src={getMediaUrl(foto)}
                                    alt="Evidência de cubagem"
                                    className="h-36 w-full object-cover transition hover:scale-[1.02]"
                                />
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
