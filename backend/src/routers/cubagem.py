import os
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse

router = APIRouter()


def _base_url() -> str:
    return os.getenv("CUBAGEM_API_URL", "http://localhost:8031").rstrip("/")


async def _proxy_json(
    method: str,
    path: str,
    payload: dict[str, Any] | None = None,
) -> JSONResponse:
    url = f"{_base_url()}{path}"
    async with httpx.AsyncClient(timeout=20.0) as client:
        try:
            resp = await client.request(method, url, json=payload)
        except httpx.HTTPError as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Falha ao acessar sidecar cubagem: {exc}",
            ) from exc

    try:
        data = resp.json()
    except ValueError:
        data = {"detail": "Resposta inválida do sidecar cubagem"}

    return JSONResponse(status_code=resp.status_code, content=data)


@router.get("/state")
async def get_state():
    return await _proxy_json("GET", "/state")


@router.get("/calibration")
async def get_calibration():
    return await _proxy_json("GET", "/calibration")


@router.post("/calibration")
async def post_calibration(request: Request):
    payload = await request.json()
    return await _proxy_json("POST", "/calibration", payload=payload)


@router.post("/measurement/manual")
async def post_manual_measurement(request: Request):
    payload = await request.json()
    return await _proxy_json("POST", "/measurement/manual", payload=payload)


@router.post("/screenshot")
async def post_screenshot(request: Request):
    payload: dict[str, Any] | None = None
    if request.headers.get("content-type", "").startswith("application/json"):
        payload = await request.json()
    return await _proxy_json("POST", "/screenshot", payload=payload)


@router.get("/snapshot")
async def get_snapshot():
    url = f"{_base_url()}/snapshot"
    async with httpx.AsyncClient(timeout=20.0) as client:
        try:
            resp = await client.get(url)
        except httpx.HTTPError as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Falha ao acessar snapshot da cubagem: {exc}",
            ) from exc

    return StreamingResponse(
        iter([resp.content]),
        media_type=resp.headers.get("content-type", "image/jpeg"),
        status_code=resp.status_code,
    )


async def _stream_passthrough(path: str):
    url = f"{_base_url()}{path}"
    client = httpx.AsyncClient(timeout=None)
    try:
        request = client.build_request("GET", url)
        upstream = await client.send(request, stream=True)
    except httpx.HTTPError as exc:
        await client.aclose()
        raise HTTPException(status_code=502, detail=f"Falha no stream da cubagem: {exc}") from exc

    if upstream.status_code >= 400:
        await upstream.aclose()
        await client.aclose()
        raise HTTPException(status_code=upstream.status_code, detail="Erro no stream da cubagem")

    async def iterator():
        try:
            async for chunk in upstream.aiter_bytes():
                if chunk:
                    yield chunk
        finally:
            await upstream.aclose()
            await client.aclose()

    return StreamingResponse(
        iterator(),
        media_type=upstream.headers.get(
            "content-type",
            "multipart/x-mixed-replace; boundary=frame",
        ),
    )


@router.get("/stream")
async def get_stream():
    return await _stream_passthrough("/stream")


@router.get("/raw-stream")
async def get_raw_stream():
    return await _stream_passthrough("/raw-stream")
