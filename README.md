# lpr_sucata_ianorth

Sistema LPR e classificação de sucata com backend FastAPI, frontend React e sidecar de cubagem em `projeto_cubagem`.

## Cubagem

Topologia:

- `frontend` consome o backend em `:8000` ou `:8030`
- `backend` faz proxy para o sidecar de cubagem em `CUBAGEM_API_URL`
- `projeto_cubagem` roda o engine de inferência e a API HTTP em `:8031`

Portas padrão:

- Backend: `8000` no processo local, `8030` no Docker Compose
- Frontend: `8020`
- Sidecar cubagem: `8031`

Variáveis relevantes:

- `CUBAGEM_API_URL=http://localhost:8031`
- `SECRET_KEY`, `ALGORITHM`
- `MODO_DESENVOLVIMENTO`

Fluxo resumido:

1. O sidecar publica `/state`, `/stream`, `/raw-stream`, `/calibration`, `/measurement/manual` e `/screenshot`.
2. O backend expõe isso sob o prefixo `/cubagem`.
3. O frontend usa essas rotas para monitoramento ao vivo, calibração, régua e medição manual.

Entrada recomendada do sidecar:

```bash
cd ../lpr-sucata-ianorth/projeto_cubagem
python scripts/cubagem_runner.py --stream rtsp://IP/cam1
```
