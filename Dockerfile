## Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps
COPY frontend/ ./
RUN npm run build

## Stage 2: Python app + built frontend
FROM python:3.12-slim
WORKDIR /app

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    git curl && \
    rm -rf /var/lib/apt/lists/*

# Timezone
ENV TZ=America/Sao_Paulo
RUN ln -sf /usr/share/zoneinfo/$TZ /etc/localtime

# Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY config/ config/
COPY services/ services/
COPY utils/ utils/
COPY models/ models/
COPY api/ api/
COPY prompts/ prompts/
COPY migrations/ migrations/
COPY main.py .

# Copy built frontend
COPY --from=frontend-builder /app/frontend/dist /app/static

# Data directory
RUN mkdir -p /app/data

EXPOSE 5815

# Serve API + static frontend via FastAPI
CMD ["python", "-m", "uvicorn", "api.app:app", "--host", "0.0.0.0", "--port", "5815"]
