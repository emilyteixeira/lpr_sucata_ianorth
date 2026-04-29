import React, { useEffect, useMemo, useRef, useState } from "react";

export interface MeasurementLine {
    id: string;
    mode: string;
    color: string;
    start: { x: number; y: number };
    end: { x: number; y: number };
    label?: string;
}

interface MeasurementCanvasProps {
    imageSrc: string | null;
    mode: string;
    strokeColor: string;
    lines: MeasurementLine[];
    onAddLine: (line: Omit<MeasurementLine, "id" | "label" | "color" | "mode">) => void;
    heightClassName?: string;
}

export function MeasurementCanvas({
    imageSrc,
    mode,
    strokeColor,
    lines,
    onAddLine,
    heightClassName = "h-[520px]",
}: MeasurementCanvasProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [draftStart, setDraftStart] = useState<{ x: number; y: number } | null>(null);
    const [draftEnd, setDraftEnd] = useState<{ x: number; y: number } | null>(null);
    const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });

    const allLines = useMemo(() => {
        if (!draftStart || !draftEnd) {
            return lines;
        }
        return [
            ...lines,
            {
                id: "__draft__",
                mode,
                color: strokeColor,
                start: draftStart,
                end: draftEnd,
            },
        ];
    }, [draftEnd, draftStart, lines, mode, strokeColor]);

    const toImageCoordinates = (clientX: number, clientY: number) => {
        const container = containerRef.current;
        const image = imageRef.current;
        if (!container || !image || !naturalSize.width || !naturalSize.height) {
            return null;
        }

        const rect = container.getBoundingClientRect();
        const displayedWidth = image.clientWidth;
        const displayedHeight = image.clientHeight;
        const offsetX = (rect.width - displayedWidth) / 2;
        const offsetY = (rect.height - displayedHeight) / 2;

        const x = clientX - rect.left - offsetX;
        const y = clientY - rect.top - offsetY;
        if (x < 0 || y < 0 || x > displayedWidth || y > displayedHeight) {
            return null;
        }

        return {
            x: (x / displayedWidth) * naturalSize.width,
            y: (y / displayedHeight) * naturalSize.height,
        };
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        const image = imageRef.current;
        if (!canvas || !container || !image) {
            return;
        }

        const width = container.clientWidth;
        const height = container.clientHeight;
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx || !naturalSize.width || !naturalSize.height) {
            return;
        }

        const displayedWidth = image.clientWidth;
        const displayedHeight = image.clientHeight;
        const offsetX = (width - displayedWidth) / 2;
        const offsetY = (height - displayedHeight) / 2;
        const scaleX = displayedWidth / naturalSize.width;
        const scaleY = displayedHeight / naturalSize.height;

        ctx.clearRect(0, 0, width, height);
        ctx.lineCap = "round";

        allLines.forEach((line) => {
            const sx = offsetX + line.start.x * scaleX;
            const sy = offsetY + line.start.y * scaleY;
            const ex = offsetX + line.end.x * scaleX;
            const ey = offsetY + line.end.y * scaleY;
            const midX = (sx + ex) / 2;
            const midY = (sy + ey) / 2;

            ctx.strokeStyle = line.color;
            ctx.lineWidth = line.id === "__draft__" ? 2 : 3;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(ex, ey);
            ctx.stroke();

            ctx.fillStyle = line.color;
            ctx.beginPath();
            ctx.arc(sx, sy, 4, 0, Math.PI * 2);
            ctx.arc(ex, ey, 4, 0, Math.PI * 2);
            ctx.fill();

            if (line.label) {
                ctx.font = "600 12px sans-serif";
                const paddingX = 8;
                const metrics = ctx.measureText(line.label);
                const labelWidth = metrics.width + paddingX * 2;
                const labelHeight = 24;

                ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
                ctx.fillRect(
                    midX - labelWidth / 2,
                    midY - labelHeight - 8,
                    labelWidth,
                    labelHeight,
                );
                ctx.fillStyle = "#ffffff";
                ctx.fillText(
                    line.label,
                    midX - metrics.width / 2,
                    midY - labelHeight / 2 - 2,
                );
            }
        });
    }, [allLines, naturalSize]);

    return (
        <div
            ref={containerRef}
            className={`relative overflow-hidden rounded-xl border border-light-border bg-slate-950 dark:border-dark-border ${heightClassName}`}
            onPointerDown={(event) => {
                const point = toImageCoordinates(event.clientX, event.clientY);
                if (!point) {
                    return;
                }
                setDraftStart(point);
                setDraftEnd(point);
            }}
            onPointerMove={(event) => {
                if (!draftStart) {
                    return;
                }
                const point = toImageCoordinates(event.clientX, event.clientY);
                if (point) {
                    setDraftEnd(point);
                }
            }}
            onPointerUp={(event) => {
                if (!draftStart) {
                    return;
                }
                const point = toImageCoordinates(event.clientX, event.clientY);
                if (point) {
                    const distance = Math.hypot(point.x - draftStart.x, point.y - draftStart.y);
                    if (distance > 5) {
                        onAddLine({ start: draftStart, end: point });
                    }
                }
                setDraftStart(null);
                setDraftEnd(null);
            }}
            onPointerLeave={() => {
                if (draftStart) {
                    setDraftStart(null);
                    setDraftEnd(null);
                }
            }}
        >
            {imageSrc ? (
                <img
                    ref={imageRef}
                    src={imageSrc}
                    alt="Base de medição"
                    className="h-full w-full object-contain"
                    onLoad={(event) => {
                        setNaturalSize({
                            width: event.currentTarget.naturalWidth,
                            height: event.currentTarget.naturalHeight,
                        });
                    }}
                />
            ) : (
                <div className="flex h-full items-center justify-center text-sm font-medium text-slate-400">
                    Aguardando imagem do sidecar...
                </div>
            )}
            <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
        </div>
    );
}
