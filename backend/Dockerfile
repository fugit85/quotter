FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1
ENV NAVEC_PATH=/app/navec.tar

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl \
    && curl -fsSL -o /app/navec.tar https://storage.yandexcloud.net/natasha-navec/packs/navec_news_v1_1B_250K_300d_100q.tar \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py dict_loader.py ./
COPY data ./data

# Cloud Run задаёт PORT (по умолчанию 8080)
ENV PORT=8080
# --timeout 20 matches the Cloud Run request timeout and frees a stuck worker
# quickly so a crafted slow request can't tie up threads.
# --limit-request-line / --limit-request-fields tighten the HTTP parser against
# malformed headers.
CMD exec gunicorn --bind 0.0.0.0:$PORT --workers 1 --threads 8 \
    --timeout 20 \
    --limit-request-line 8190 \
    --limit-request-fields 64 \
    --access-logfile - \
    main:app
