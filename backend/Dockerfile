FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

# Cloud Run задаёт PORT (по умолчанию 8080)
ENV PORT=8080
CMD exec gunicorn --bind 0.0.0.0:$PORT --workers 1 --threads 8 --timeout 120 main:app
