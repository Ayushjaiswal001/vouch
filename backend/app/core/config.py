"""Centralized settings (env-driven)."""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="VOUCH_", env_file=".env", extra="ignore")

    # Comma-separated allowed CORS origins for the Next.js frontend.
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    # Optional GitHub PAT; falls back to GITHUB_TOKEN inside services.search.
    github_token: str | None = None

    # LLM (OpenAI-compatible). Empty key => deterministic fallback is used.
    llm_api_key: str | None = None
    llm_base_url: str = "https://api.groq.com/openai/v1"
    llm_model: str = "llama-3.3-70b-versatile"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
