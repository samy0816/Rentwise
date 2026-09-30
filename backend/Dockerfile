# RentWise backend - production image
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application code
COPY app ./app

# Uploads directory (mount a Railway Volume here to persist uploaded PDFs)
RUN mkdir -p /app/data/uploads

EXPOSE 8000

# Bind to the port the Railway proxy targets. It currently routes to the
# Dockerfile EXPOSE port (8000), so listen there explicitly rather than $PORT.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port 8000"]
