"""Application configuration.

All settings are loaded from environment variables (via pydantic-settings)
so the same code runs in development, production and local demo mode.
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- App ---
    APP_NAME: str = "RentWise API"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    SEED_DEMO_DATA: bool = True
    API_V1_PREFIX: str = ""

    # --- Security ---
    SECRET_KEY: str = "replace-me"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days
    ALGORITHM: str = "HS256"

    # --- Database ---
    DATABASE_URL: str = "sqlite:///./rentwise.db"

    # --- Demo mode ---
    # When enabled, the app uses SQLite, a deterministic local embedding
    # model and a built-in rule based "demo LLM" so the product can be
    # demoed with no external services.
    DEMO_MODE: bool = True

    # --- AI provider ---
    # "auto" (default) | "demo" | "openai" | "google".
    # - "auto" infers the provider from whichever API key is configured
    #   (Gemini takes priority over OpenAI) and falls back to demo mode if
    #   no key is present.
    # - "demo" forces the fully-local demo mode.
    # - "openai"/"google" force that provider.
    AI_PROVIDER: str = "auto"

    # --- AI (OpenAI) ---
    OPENAI_API_KEY: str | None = None
    OPENAI_MODEL: str = "gpt-4o-mini"
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"

    # --- AI (Google Gemini) ---
    GEMINI_API_KEY: str | None = None
    GEMINI_MODEL: str = "gemini-2.0-flash"
    # Some keys don't expose `text-embedding-004`; `gemini-embedding-2` is the
    # broadly available alternative.
    GEMINI_EMBEDDING_MODEL: str = "models/gemini-embedding-2"

    # --- CORS ---
    CORS_ORIGINS: str = "http://localhost:3000"

    # --- Uploads ---
    UPLOAD_DIR: Path = Path("./data/uploads")
    MAX_UPLOAD_MB: int = 20

    @property
    def ai_provider(self) -> str:
        """Resolve the active AI provider: 'google', 'openai' or 'demo'."""
        if self.AI_PROVIDER == "demo" or self.DEMO_MODE:
            return "demo"
        if self.AI_PROVIDER in ("google", "openai"):
            return self.AI_PROVIDER
        # Auto: infer from whichever API key is configured (Gemini wins).
        if self.GEMINI_API_KEY:
            return "google"
        if self.OPENAI_API_KEY:
            return "openai"
        return "demo"

    @property
    def is_demo(self) -> bool:
        """Whether the backend should run in local/demo mode."""
        return self.ai_provider == "demo"

    @property
    def cors_origin_list(self) -> List[str]:
        return [o.strip().rstrip("/") for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
