"""FastAPI application factory for VOUCH."""

from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import health, recommend, repo, search
from app.core.config import settings


def create_app() -> FastAPI:
    app = FastAPI(title="VOUCH API", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(health.router, prefix="/api")
    app.include_router(search.router, prefix="/api")
    app.include_router(repo.router, prefix="/api")
    app.include_router(recommend.router, prefix="/api")
    return app


app = create_app()


def _uvicorn_run(app_path: str, **kwargs: object) -> None:
    """Thin seam so tests can monkeypatch without importing uvicorn."""
    import uvicorn

    uvicorn.run(app_path, **kwargs)  # type: ignore[arg-type]


def run() -> None:
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "8000"))
    _uvicorn_run("app.main:app", host=host, port=port, reload=False)


if __name__ == "__main__":
    run()
