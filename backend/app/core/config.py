"""
Application configuration using Pydantic Settings.
"""
from functools import lru_cache
from typing import List, Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Application
    APP_NAME: str = "Happy Little Learners"
    APP_ENV: str = "development"
    DEBUG: bool = True
    FRONTEND_URL: str = "http://localhost:5173"
    BACKEND_URL: str = "http://localhost:8000"
    SECRET_KEY: str = Field(..., min_length=32)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_NAME: str = "happy_little_learners"
    DB_USER: str = "root"
    DB_PASSWORD: str = ""
    DB_CHARSET: str = "utf8mb4"
    MYSQL_ROOT_PASSWORD: str = ""

    # Database URL (optional - if provided, individual params are ignored)
    DATABASE_URL: Optional[str] = None

    @property
    def database_url(self) -> str:
        """Construct database URL from individual components or use provided URL."""
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return (
            f"mysql+asyncmy://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
            f"?charset={self.DB_CHARSET}"
        )

    # CORS
    CORS_ORIGINS: List[str] = Field(default_factory=lambda: ["http://localhost:5173", "http://127.0.0.1:5173"])

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: str | List[str]) -> List[str]:
        if isinstance(v, str):
            # Handle JSON array string or comma-separated string
            v = v.strip()
            if v.startswith("["):
                import json
                return json.loads(v)
            return [origin.strip() for origin in v.split(",")]
        return v

    # Email (Optional)
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_EMAIL: Optional[str] = None
    SMTP_FROM_NAME: str = "Happy Little Learners"
    EMAIL_VERIFICATION_ENABLED: bool = False

    # SMS/OTP (Optional)
    SMS_PROVIDER: Optional[str] = None
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_PHONE_NUMBER: Optional[str] = None
    OTP_ENABLED: bool = False

    # File Storage (Optional)
    STORAGE_PROVIDER: str = "local"
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE_MB: int = 10
    ALLOWED_IMAGE_TYPES: str = "image/jpeg,image/png,image/webp,image/svg+xml"
    ALLOWED_AUDIO_TYPES: str = "audio/mpeg,audio/ogg,audio/wav"

    # Speech/TTS (Optional)
    TTS_PROVIDER: Optional[str] = None
    TTS_API_KEY: Optional[str] = None
    TTS_VOICE_DEFAULT: str = "default"

    # Rate Limiting
    RATE_LIMIT_LOGIN_ATTEMPTS: int = 5
    RATE_LIMIT_LOGIN_WINDOW_MINUTES: int = 15
    RATE_LIMIT_API_REQUESTS: int = 100
    RATE_LIMIT_API_WINDOW_MINUTES: int = 1

    # Frontend (Vite)
    VITE_API_URL: str = "http://localhost:8000/api/v1"
    VITE_APP_NAME: str = "Happy Little Learners"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()