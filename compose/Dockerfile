FROM python:3.12-slim

# Prevent Python from writing .pyc files and enable unbuffered output for logging
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install system dependencies (including tini for handling PID 1 signals)
RUN apt-get update && apt-get install -y --no-install-recommends \
    tini \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . /app/

# Expose port
EXPOSE 8000

# Use tini as the entrypoint
ENTRYPOINT ["/usr/bin/tini", "--"]

# Run database migrations and start Daphne (ASGI server — supports WebSocket)
CMD ["sh", "-c", "python manage.py migrate --noinput && daphne -b 0.0.0.0 -p 8000 chatapp.asgi:application"]