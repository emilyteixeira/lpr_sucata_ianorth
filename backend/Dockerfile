FROM python:3.11-slim-bullseye


RUN sed -i 's/deb.debian.org/ftp.br.debian.org/g' /etc/apt/sources.list \
    && apt-get update \
    && apt-get install -y --fix-missing \
    curl \
    gnupg2 \
    unixodbc \
    unixodbc-dev \
    ffmpeg \
    && curl https://packages.microsoft.com/keys/microsoft.asc | apt-key add - \
    && curl https://packages.microsoft.com/config/debian/11/prod.list > /etc/apt/sources.list.d/mssql-release.list \
    && apt-get update \
    && ACCEPT_EULA=Y apt-get install -y msodbcsql17 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app


COPY backend/requirements.txt .


RUN pip install --no-cache-dir -r requirements.txt


COPY backend/ .



CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]