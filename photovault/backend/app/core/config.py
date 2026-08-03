"""
Application configuration using Pydantic Settings.
"""
from typing import List, Optional
from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
import json


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    APP_NAME: str = "PhotoVault"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    SECRET_KEY: str = "change-this-in-production-use-strong-secret-key"
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 4

    # URLs
    FRONTEND_URL: str = "http://localhost:3000"
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://photovault:photovault@db:5432/photovault"
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 10
    
    # Redis
    REDIS_URL: str = "redis://redis:6379/0"
    CELERY_BROKER_URL: str = "redis://redis:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://redis:6379/2"
    
    # JWT
    # If JWT_SECRET_KEY is not set, we fall back to SECRET_KEY.
    JWT_SECRET_KEY: str = ""
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        60,
        validation_alias=AliasChoices("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "ACCESS_TOKEN_EXPIRE_MINUTES"),
    )
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = Field(
        7,
        validation_alias=AliasChoices("JWT_REFRESH_TOKEN_EXPIRE_DAYS", "REFRESH_TOKEN_EXPIRE_DAYS"),
    )
    
    # Email
    EMAIL_VERIFICATION_REQUIRED: bool = True
    SMTP_HOST: str = "mailpit"
    SMTP_PORT: int = 1025
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = Field(
        "noreply@photovault.app",
        validation_alias=AliasChoices("SMTP_FROM_EMAIL", "SMTP_FROM"),
    )
    SMTP_FROM_NAME: str = "PhotoVault"
    SMTP_USE_TLS: bool = False  # Implicit TLS (e.g., port 465)
    SMTP_STARTTLS: Optional[bool] = None  # Auto if unset
    EMAIL_VERIFICATION_EXPIRE_HOURS: int = 24
    
    # NAS/SMB
    NAS_HOST: str = "192.168.1.100"
    NAS_PORT: int = 445
    NAS_USERNAME: str = ""
    NAS_PASSWORD: str = ""
    NAS_SHARE_NAME: str = "photos"
    NAS_MOUNT_PATH: str = "/mnt/nas"
    
    # Storage
    LOCAL_STORAGE_PATH: str = "/app/data"
    THUMBNAIL_PATH: str = "/app/data/thumbnails"
    CACHE_PATH: str = "/app/data/cache"
    
    # AI Features
    AI_ENABLED: bool = True
    FACE_RECOGNITION_ENABLED: bool = True
    CLIP_ENABLED: bool = True
    YOLO_ENABLED: bool = True
    
    # AI Models
    # ViT-B-16 has better accuracy than ViT-B-32 with the same 512-D embedding space.
    CLIP_MODEL: str = "ViT-B-16"
    CLIP_PRETRAINED: str = "openai"
    # yolov8s (small) has significantly better mAP than yolov8n (nano) with modest extra compute.
    YOLO_MODEL: str = "yolov8s.pt"
    # "hog" is CPU-friendly; switch to "cnn" when a GPU is available for higher accuracy.
    FACE_RECOGNITION_MODEL: str = "hog"
    # 0.55 tolerance reduces false-positive face matches vs the default 0.6.
    FACE_RECOGNITION_TOLERANCE: float = 0.55
    
    # Processing
    BATCH_SIZE: int = 32
    MAX_CONCURRENT_JOBS: int = 4
    THUMBNAIL_SIZES: List[int] = [150, 300, 600, 1200]
    
    # Vector Search
    VECTOR_DIMENSION: int = 512
    SIMILARITY_THRESHOLD: float = 0.7
    
    # Admin
    ADMIN_EMAIL: str = Field(
        "admin@photovault.app",
        validation_alias=AliasChoices("ADMIN_EMAIL", "FIRST_ADMIN_EMAIL"),
    )
    ADMIN_PASSWORD: str = Field(
        "admin123",
        validation_alias=AliasChoices("ADMIN_PASSWORD", "FIRST_ADMIN_PASSWORD"),
    )
    REQUIRE_ADMIN_APPROVAL: bool = True
    # Dangerous: exposes system connection secrets over an API endpoint for admins.
    # Keep disabled by default; only enable for local debugging.
    ENABLE_ADMIN_SECRETS: bool = False
    
    # CORS
    # Accept either CSV ("http://a,http://b") or JSON list string.
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    def cors_origins_list(self) -> List[str]:
        value = (self.CORS_ORIGINS or "").strip()
        if not value:
            return []
        if value.startswith("["):
            try:
                parsed = json.loads(value)
                if isinstance(parsed, list):
                    return [str(x).strip() for x in parsed if str(x).strip()]
            except Exception:
                # Fall back to CSV parsing
                pass
        return [origin.strip() for origin in value.split(",") if origin.strip()]

    @field_validator("SMTP_STARTTLS", mode="before")
    @classmethod
    def parse_smtp_starttls(cls, v):
        if v is None:
            return None
        if isinstance(v, str) and not v.strip():
            return None
        return v
    
    @field_validator("THUMBNAIL_SIZES", mode="before")
    @classmethod
    def parse_thumbnail_sizes(cls, v):
        if isinstance(v, str):
            return [int(s.strip()) for s in v.split(",")]
        return v
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
