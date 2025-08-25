# Multi-stage build for production-ready Telegram Userbot Manager
FROM node:18-alpine AS frontend-builder

# Set working directory for frontend
WORKDIR /app/frontend

# Copy package files
COPY frontend/package.json frontend/yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

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
RUN cat > /etc/supervisor/conf.d/supervisord.conf << 'EOF'
[supervisord]
nodaemon=true
logfile=/var/log/supervisor/supervisord.log
pidfile=/var/run/supervisord.pid

[program:backend]
command=python -m uvicorn server:app --host 0.0.0.0 --port 8001
directory=/app/backend
autostart=true
autorestart=true
stdout_logfile=/var/log/supervisor/backend.out.log
stderr_logfile=/var/log/supervisor/backend.err.log

[program:frontend]
command=python -m http.server 3000 --directory build
directory=/app/frontend
autostart=true
autorestart=true
stdout_logfile=/var/log/supervisor/frontend.out.log
stderr_logfile=/var/log/supervisor/frontend.err.log
EOF

# Create environment file template
RUN cat > /app/backend/.env.template << 'EOF'
MONGO_URL=mongodb://mongodb:27017
DB_NAME=telegram_userbot
CORS_ORIGINS=*
EOF

# Create frontend environment template  
RUN cat > /app/frontend/.env.template << 'EOF'
REACT_APP_BACKEND_URL=http://localhost:8001
EOF

# Create startup script
RUN cat > /app/start.sh << 'EOF'
#!/bin/bash

# Copy environment templates if env files don't exist
if [ ! -f /app/backend/.env ]; then
    cp /app/backend/.env.template /app/backend/.env
fi

if [ ! -f /app/frontend/.env ]; then
    cp /app/frontend/.env.template /app/frontend/.env
fi

# Start supervisor
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
EOF

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