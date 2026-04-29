import { API_BASE_URL } from "../config";
import type {
    CubagemState,
    HomographyCalibration,
    ManualMeasurement,
} from "../types";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, init);
    if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Erro HTTP ${response.status}`);
    }
    return response.json() as Promise<T>;
}

export const fetchCubagemState = (): Promise<CubagemState> =>
    fetchJson<CubagemState>(`${API_BASE_URL}/cubagem/state`);

export const fetchCalibration = (): Promise<HomographyCalibration> =>
    fetchJson<HomographyCalibration>(`${API_BASE_URL}/cubagem/calibration`);

export const saveCalibration = (
    points: [number, number][],
    largura_m: number,
    altura_m: number,
) =>
    fetchJson(`${API_BASE_URL}/cubagem/calibration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points, largura_m, altura_m }),
    });

export const saveManualMeasurement = (measurement: ManualMeasurement) =>
    fetchJson(`${API_BASE_URL}/cubagem/measurement/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(measurement),
    });

export const triggerScreenshot = () =>
    fetchJson(`${API_BASE_URL}/cubagem/screenshot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
    });

export const cubagemStreamUrl = () => `${API_BASE_URL}/cubagem/stream`;
export const cubagemRawStreamUrl = () => `${API_BASE_URL}/cubagem/raw-stream`;
export const cubagemSnapshotUrl = () =>
    `${API_BASE_URL}/cubagem/snapshot?ts=${Date.now()}`;
