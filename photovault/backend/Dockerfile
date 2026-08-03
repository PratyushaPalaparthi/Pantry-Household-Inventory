# Backend Dockerfile
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    libpq-dev \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    libopenblas-dev \
    liblapack-dev \
    curl \
    ffmpeg \
    libmagic1 \
    cifs-utils \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    printf "cmake<4\n" > /tmp/build-constraints.txt && \
    pip install --no-cache-dir --build-constraint /tmp/build-constraints.txt -r requirements.txt && \
    rm -f /tmp/build-constraints.txt

# Pre-download AI models into the image so startup is fast.
# yolov8s (small) replaces yolov8n (nano) for better object detection accuracy.
RUN python -c "from ultralytics import YOLO; YOLO('yolov8s.pt')"
# ViT-B-16 replaces ViT-B-32 for better CLIP semantic-search accuracy.
RUN python -c "import open_clip; open_clip.create_model_and_transforms('ViT-B-16', pretrained='openai')"
# Warm up pillow-heif so HEIC support is available immediately
RUN python -c "from pillow_heif import register_heif_opener; register_heif_opener()"

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p /media /thumbnails /nas

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
