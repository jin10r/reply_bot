# Multi-stage build for production-ready Telegram Userbot Manager
FROM node:18-alpine AS frontend-builder

# Set working directory for frontend
WORKDIR /app/frontend

# Copy package.json first
COPY frontend/package.json ./

# Install dependencies (this will generate yarn.lock if it doesn't exist)
RUN yarn install

# Copy frontend source
COPY frontend/ ./

# Build frontend
RUN yarn build

# Python backend stage
FROM python:3.11-slim AS backend

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy backend requirements
COPY backend/requirements.txt backend/

# Install Python dependencies
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend source
COPY backend/ backend/

# Copy built frontend
COPY --from=frontend-builder /app/frontend/build frontend/build

# Create necessary directories
RUN mkdir -p /app/backend/uploads \
    /var/log/supervisor \
    /etc/supervisor/conf.d

# Create supervisor configuration
RUN echo "[supervisord]" > /etc/supervisor/conf.d/supervisord.conf && \
    echo "nodaemon=true" >> /etc/supervisor/conf.d/supervisord.conf && \
    echo "logfile=/var/log/supervisor/supervisord.log" >> /etc/supervisor/conf.d/supervisord.conf && \
    echo "pidfile=/var/run/supervisord.pid" >> /etc/supervisor/conf.d/supervisord.conf && \
    echo "" >> /etc/supervisor/conf.d/supervisord.conf && \
    echo "[program:backend]" >> /etc/supervisor/conf.d/supervisord.conf && \
    echo "command=python -m uvicorn server:app --host 0.0.0.0 --port 8001" >> /etc/supervisor/conf.d/supervisord.conf && \
    echo "directory=/app/backend" >> /etc/supervisor/conf.d/supervisord.conf && \
    echo "autostart=true" >> /etc/supervisor/conf.d/supervisord.conf && \
    echo "autorestart=true" >> /etc/supervisor/conf.d/supervisord.conf && \
    echo "stdout_logfile=/var/log/supervisor/backend.out.log" >> /etc/supervisor/conf.d/supervisord.conf && \
    echo "stderr_logfile=/var/log/supervisor/backend.err.log" >> /etc/supervisor/conf.d/supervisord.conf && \
    echo "" >> /etc/supervisor/conf.d/supervisord.conf && \
    echo "[program:frontend]" >> /etc/supervisor/conf.d/supervisord.conf && \
    echo "command=python -m http.server 3000 --directory build" >> /etc/supervisor/conf.d/supervisord.conf && \
    echo "directory=/app/frontend" >> /etc/supervisor/conf.d/supervisord.conf && \
    echo "autostart=true" >> /etc/supervisor/conf.d/supervisord.conf && \
    echo "autorestart=true" >> /etc/supervisor/conf.d/supervisord.conf && \
    echo "stdout_logfile=/var/log/supervisor/frontend.out.log" >> /etc/supervisor/conf.d/supervisord.conf && \
    echo "stderr_logfile=/var/log/supervisor/frontend.err.log" >> /etc/supervisor/conf.d/supervisord.conf

# Create environment file template
RUN echo "MONGO_URL=mongodb://mongodb:27017" > /app/backend/.env.template && \
    echo "DB_NAME=telegram_userbot" >> /app/backend/.env.template && \
    echo "CORS_ORIGINS=*" >> /app/backend/.env.template

# Create frontend environment template  
RUN echo "REACT_APP_BACKEND_URL=http://localhost:8001" > /app/frontend/.env.template

# Create startup script
RUN echo "#!/bin/bash" > /app/start.sh && \
    echo "" >> /app/start.sh && \
    echo "# Copy environment templates if env files don't exist" >> /app/start.sh && \
    echo "if [ ! -f /app/backend/.env ]; then" >> /app/start.sh && \
    echo "    cp /app/backend/.env.template /app/backend/.env" >> /app/start.sh && \
    echo "fi" >> /app/start.sh && \
    echo "" >> /app/start.sh && \
    echo "if [ ! -f /app/frontend/.env ]; then" >> /app/start.sh && \
    echo "    cp /app/frontend/.env.template /app/frontend/.env" >> /app/start.sh && \
    echo "fi" >> /app/start.sh && \
    echo "" >> /app/start.sh && \
    echo "# Start supervisor" >> /app/start.sh && \
    echo "exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf" >> /app/start.sh

RUN chmod +x /app/start.sh

# Expose ports
EXPOSE 3000 8001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8001/api/ || exit 1

# Create volumes for persistent data
VOLUME ["/app/backend/uploads", "/app/data"]

# Set default command
CMD ["/app/start.sh"]

# Labels
LABEL maintainer="Telegram Userbot Manager"
LABEL description="Telegram Userbot with Pyrogram and Web Interface"
LABEL version="1.0.0"