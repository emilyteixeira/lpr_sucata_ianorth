import React, { useState } from "react";
import { RefreshCcw, WifiOff } from "lucide-react";

interface LiveStreamProps {
    src: string;
    title?: string;
    className?: string;
}

export function LiveStream({
    src,
    title = "Stream ao vivo",
    className = "",
}: LiveStreamProps) {
    const [reloadKey, setReloadKey] = useState(0);
    const [hasError, setHasError] = useState(false);

    const resolvedSrc = `${src}${src.includes("?") ? "&" : "?"}v=${reloadKey}`;

    return (
        <div
            className={`relative overflow-hidden rounded-xl border border-light-border bg-light-surface shadow-sm dark:border-dark-border dark:bg-dark-surface ${className}`}
        >
            <div className="flex items-center justify-between border-b border-light-border px-4 py-3 dark:border-dark-border">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
                    {title}
                </h3>
                <button
                    type="button"
                    onClick={() => {
                        setHasError(false);
                        setReloadKey((value) => value + 1);
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-light-border px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-dark-border dark:text-slate-300 dark:hover:bg-slate-800"
                >
                    <RefreshCcw size={14} />
                    Recarregar
                </button>
            </div>

            <div className="relative aspect-video bg-slate-950">
                <img
                    key={resolvedSrc}
                    src={resolvedSrc}
                    alt={title}
                    className="h-full w-full object-cover"
                    onLoad={() => setHasError(false)}
                    onError={() => setHasError(true)}
                />

                {hasError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/85 px-6 text-center text-white">
                        <WifiOff size={28} />
                        <div>
                            <p className="text-sm font-semibold">Stream indisponível</p>
                            <p className="text-xs text-slate-300">
                                Verifique o sidecar e tente novamente.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setHasError(false);
                                setReloadKey((value) => value + 1);
                            }}
                            className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-900 transition hover:bg-slate-100"
                        >
                            Tentar novamente
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
