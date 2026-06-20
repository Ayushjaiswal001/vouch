# VOUCH Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the VOUCH backend — a FastAPI service that wraps the migrated `find_oss` scoring pipeline and exposes `/api/health`, `/api/search`, and `/api/repo/{owner}/{name}`, at functional parity with today's Flask tool, with the pytest suite green.

**Architecture:** Monorepo at `D:\vouch`. The existing `find_oss` Python package is copied verbatim into `backend/app/services/` (its relative imports stay valid, so no rewrite). A thin FastAPI layer (`backend/app/api/*`) reuses `pipeline.run()` and a new single-repo enrich path, serializing results with a JSON shape ported from the current Flask `_serialize_item`. SQLite cache travels with the package and self-locates at `backend/app/cache.db`.

**Tech Stack:** Python 3.11+, FastAPI, Uvicorn, pydantic v2, pydantic-settings, requests, pytest, httpx (FastAPI TestClient). No paid services — GitHub REST + OSSF Scorecard only (free; optional free PAT via `GITHUB_TOKEN`).

**Source of truth for migrated code:** `D:\find-oss\find_oss\` (read-only reference; do not modify it).

---

## File Structure

```
vouch/
  backend/
    pyproject.toml                 # backend package + deps + scripts
    app/
      __init__.py
      main.py                      # create_app(): FastAPI + CORS + router mount
      core/
        __init__.py
        config.py                  # Settings (env): cors origins, github token
      api/
        __init__.py
        health.py                  # GET /api/health
        search.py                  # GET /api/search
        repo.py                    # GET /api/repo/{owner}/{name}
      models/
        __init__.py
        schemas.py                 # pydantic response models
      serializers.py               # scored-item -> dict (ported from Flask)
      services/                    # <-- migrated find_oss package (copied verbatim)
        __init__.py
        cache.py
        search.py
        filters.py
        safety.py
        pc_fit.py
        score.py
        report.py
        pipeline.py                # + new enrich_repo()
    tests/
      __init__.py
      conftest.py                  # ported fixtures
      test_filters.py              # ported
      test_score.py                # ported
      test_pc_fit.py               # ported
      test_api_health.py           # new
      test_api_search.py           # new (mocked pipeline)
      test_api_repo.py             # new (mocked)
  docker-compose.yml               # backend service (added at end)
```

**Responsibilities:**
- `services/` — unchanged business logic (search, filter, enrich, score). One concern: "given a query/repo, produce scored data."
- `serializers.py` — pure transform from internal scored dicts to API JSON. No I/O.
- `api/*` — HTTP edges only: parse params, call pipeline, serialize, return. One file per resource.
- `models/schemas.py` — the typed contract the frontend will consume.
- `core/config.py` — all env-driven settings in one place.

---

## Task 1: Backend scaffold + health endpoint

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/app/__init__.py` (empty)
- Create: `backend/app/core/__init__.py` (empty)
- Create: `backend/app/core/config.py`
- Create: `backend/app/api/__init__.py` (empty)
- Create: `backend/app/api/health.py`
- Create: `backend/app/main.py`
- Create: `backend/tests/__init__.py` (empty)
- Test: `backend/tests/test_api_health.py`

- [ ] **Step 1: Create `backend/pyproject.toml`**

```toml
[project]
name = "vouch-backend"
version = "0.1.0"
description = "VOUCH backend — FastAPI wrapper over the find_oss discovery pipeline."
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.110",
    "uvicorn[standard]>=0.29",
    "pydantic>=2.6",
    "pydantic-settings>=2.2",
    "requests>=2.32",
]

[project.optional-dependencies]
dev = ["pytest>=8.0", "pytest-mock>=3.12", "httpx>=0.27"]

[project.scripts]
vouch-api = "app.main:run"

[build-system]
requires = ["setuptools>=68"]
build-backend = "setuptools.build_meta"

[tool.setuptools.packages.find]
include = ["app*"]

[tool.pytest.ini_options]
markers = ["integration: hits real APIs (set RUN_INTEGRATION=1)"]
```

- [ ] **Step 2: Create `backend/app/core/config.py`**

```python
"""Centralized settings (env-driven)."""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="VOUCH_", env_file=".env", extra="ignore")

    # Comma-separated allowed CORS origins for the Next.js frontend.
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    # Optional GitHub PAT; falls back to GITHUB_TOKEN inside services.search.
    github_token: str | None = None

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
```

- [ ] **Step 3: Write the failing test `backend/tests/test_api_health.py`**

```python
from fastapi.testclient import TestClient

from app.main import create_app


def test_health_ok():
    client = TestClient(create_app())
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok", "service": "vouch-backend"}
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `cd backend && python -m pytest tests/test_api_health.py -v`
Expected: FAIL (ModuleNotFoundError: app.main / app.api.health not found).

- [ ] **Step 5: Create `backend/app/api/health.py`**

```python
"""Health check route."""

from __future__ import annotations

from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "vouch-backend"}
```

- [ ] **Step 6: Create `backend/app/main.py`**

```python
"""FastAPI application factory for VOUCH."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import health
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
    return app


app = create_app()


def run() -> None:
    import uvicorn

    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=False)


if __name__ == "__main__":
    run()
```

- [ ] **Step 7: Install and run the test to verify it passes**

Run: `cd backend && pip install -e .[dev] && python -m pytest tests/test_api_health.py -v`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/pyproject.toml backend/app backend/tests
git commit -m "feat(backend): FastAPI scaffold + health endpoint"
```

---

## Task 2: Migrate the find_oss pipeline + port its tests

This is mechanical (copy + path fix). Good candidate to delegate to a lower model during execution.

**Files:**
- Create (copy verbatim from `D:\find-oss\find_oss\`): `backend/app/services/{__init__.py,cache.py,search.py,filters.py,safety.py,pc_fit.py,score.py,report.py,pipeline.py}`
- Create (copy from `D:\find-oss\tests\`): `backend/tests/{conftest.py,test_filters.py,test_score.py,test_pc_fit.py}`

- [ ] **Step 1: Copy the package files**

Run (PowerShell):
```powershell
New-Item -ItemType Directory -Force D:\vouch\backend\app\services | Out-Null
Copy-Item D:\find-oss\find_oss\__init__.py,D:\find-oss\find_oss\cache.py,D:\find-oss\find_oss\search.py,D:\find-oss\find_oss\filters.py,D:\find-oss\find_oss\safety.py,D:\find-oss\find_oss\pc_fit.py,D:\find-oss\find_oss\score.py,D:\find-oss\find_oss\report.py,D:\find-oss\find_oss\pipeline.py D:\vouch\backend\app\services\
```

Note: the package uses only relative imports (`from . import ...`, `from .filters import _parse_dt`, `from .search import ...`), so they remain valid under the new package path with **no edits**. The cache self-locates at `backend/app/cache.db` (it is `Path(__file__).parent.parent / "cache.db"`).

- [ ] **Step 2: Copy the test files and their import target**

Run (PowerShell):
```powershell
Copy-Item D:\find-oss\tests\conftest.py,D:\find-oss\tests\test_filters.py,D:\find-oss\tests\test_score.py,D:\find-oss\tests\test_pc_fit.py D:\vouch\backend\tests\
```

- [ ] **Step 3: Fix the import path in the copied tests**

The original tests import from `find_oss.*`. Update each copied test file and `conftest.py` to import from `app.services.*` instead. Replace every occurrence of `from find_oss` with `from app.services` and `import find_oss` with `import app.services as find_oss` (only if such a form exists).

Use Grep to find them first:
Run: `cd backend && python -c "import pathlib,re; [print(p) for p in pathlib.Path('tests').glob('*.py') if 'find_oss' in p.read_text()]"`

Then edit each listed file accordingly.

- [ ] **Step 4: Run the ported pipeline tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_filters.py tests/test_score.py tests/test_pc_fit.py -v`
Expected: PASS (the same count as the original suite for these three files).

- [ ] **Step 5: Commit**

```bash
git add backend/app/services backend/tests
git commit -m "feat(backend): migrate find_oss pipeline into services + port tests"
```

---

## Task 3: Response schemas + serializer

**Files:**
- Create: `backend/app/models/__init__.py` (empty)
- Create: `backend/app/models/schemas.py`
- Create: `backend/app/serializers.py`
- Test: `backend/tests/test_serializer.py`

- [ ] **Step 1: Create `backend/app/models/schemas.py`**

```python
"""API response contracts shared with the frontend."""

from __future__ import annotations

from pydantic import BaseModel


class Scores(BaseModel):
    total: float
    safety: float
    popularity: float
    maintenance: float
    pc_fit: float


class Scorecard(BaseModel):
    score: float | None = None
    checks: dict[str, int] = {}


class PcDetails(BaseModel):
    stack: str | None = None
    win_install_bytes: int | None = None
    win_install_str: str | None = None


class RepoResult(BaseModel):
    full_name: str
    html_url: str
    description: str = ""
    stars: int = 0
    license: str = "?"
    pushed_at: str | None = None
    created_at: str | None = None
    language: str = ""
    topics: list[str] = []
    scorecard: Scorecard | None = None
    advisories_count: int = 0
    has_high_advisory: bool = False
    has_critical_advisory: bool = False
    pc_details: PcDetails
    scores: Scores


class DroppedRepo(BaseModel):
    full_name: str
    html_url: str = ""
    reason: str


class SearchResponse(BaseModel):
    ok: bool
    error: str | None = None
    error_kind: str | None = None
    query: str
    considered: int = 0
    dropped: list[DroppedRepo] = []
    top: list[RepoResult] = []
    auth: bool = False
```

- [ ] **Step 2: Write the failing test `backend/tests/test_serializer.py`**

```python
from app.serializers import serialize_item


def _fake_item():
    return {
        "repo": {
            "full_name": "neovim/neovim",
            "html_url": "https://github.com/neovim/neovim",
            "description": "vim fork",
            "stargazers_count": 84000,
            "license": {"spdx_id": "Apache-2.0"},
            "pushed_at": "2026-06-01T00:00:00Z",
            "created_at": "2015-01-01T00:00:00Z",
            "language": "C",
            "topics": ["editor"],
        },
        "enrichment": {
            "scorecard": {"score": 8.4, "checks": {"Maintained": 10}},
            "advisories": [],
            "has_high": False,
            "has_critical": False,
        },
        "pc_details": {"stack": "C", "win_install_bytes": 38_000_000},
        "score_total": 0.83,
        "safety_score": 0.84,
        "pop_score": 0.98,
        "maint_score": 1.0,
        "pc_score": 0.8,
    }


def test_serialize_item_shape():
    out = serialize_item(_fake_item())
    assert out["full_name"] == "neovim/neovim"
    assert out["license"] == "Apache-2.0"
    assert out["scorecard"]["score"] == 8.4
    assert out["scores"]["total"] == 0.83
    assert out["pc_details"]["win_install_str"]  # non-empty formatted size
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd backend && python -m pytest tests/test_serializer.py -v`
Expected: FAIL (app.serializers not found).

- [ ] **Step 4: Create `backend/app/serializers.py`** (ported from the Flask `_serialize_item` / `_serialize_dropped`)

```python
"""Pure transforms: internal scored dicts -> API JSON dicts."""

from __future__ import annotations

from typing import Any

from app.services import pc_fit


def serialize_item(item: dict[str, Any]) -> dict[str, Any]:
    r = item["repo"]
    sc = item["enrichment"].get("scorecard")
    advisories = item["enrichment"].get("advisories", [])
    return {
        "full_name": r["full_name"],
        "html_url": r["html_url"],
        "description": r.get("description") or "",
        "stars": r.get("stargazers_count", 0),
        "license": (r.get("license") or {}).get("spdx_id", "?"),
        "pushed_at": r.get("pushed_at"),
        "created_at": r.get("created_at"),
        "language": r.get("language") or "",
        "topics": r.get("topics") or [],
        "scorecard": None
        if sc is None
        else {"score": sc.get("score"), "checks": sc.get("checks", {})},
        "advisories_count": len(advisories),
        "has_high_advisory": item["enrichment"].get("has_high", False),
        "has_critical_advisory": item["enrichment"].get("has_critical", False),
        "pc_details": {
            "stack": item["pc_details"].get("stack"),
            "win_install_bytes": item["pc_details"].get("win_install_bytes"),
            "win_install_str": pc_fit.format_size(
                item["pc_details"].get("win_install_bytes")
            ),
        },
        "scores": {
            "total": round(item["score_total"], 3),
            "safety": round(item["safety_score"], 3),
            "popularity": round(item["pop_score"], 3),
            "maintenance": round(item["maint_score"], 3),
            "pc_fit": round(item["pc_score"], 3),
        },
    }


def serialize_dropped(
    dropped: list[tuple[dict[str, Any], str]]
) -> list[dict[str, Any]]:
    return [
        {
            "full_name": r.get("full_name", "?"),
            "html_url": r.get("html_url", ""),
            "reason": reason,
        }
        for r, reason in dropped
    ]
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd backend && python -m pytest tests/test_serializer.py -v`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/app/models backend/app/serializers.py backend/tests/test_serializer.py
git commit -m "feat(backend): response schemas + JSON serializer"
```

---

## Task 4: `/api/search` endpoint

**Files:**
- Create: `backend/app/api/search.py`
- Modify: `backend/app/main.py` (mount the search router)
- Test: `backend/tests/test_api_search.py`

- [ ] **Step 1: Write the failing test `backend/tests/test_api_search.py`**

```python
from fastapi.testclient import TestClient

from app.main import create_app


def _ok_pipeline_result():
    return {
        "ok": True,
        "query": "markdown editor",
        "considered": 3,
        "dropped": [({"full_name": "x/y", "html_url": "u"}, "archived")],
        "top": [
            {
                "repo": {
                    "full_name": "a/b",
                    "html_url": "https://github.com/a/b",
                    "description": "d",
                    "stargazers_count": 1000,
                    "license": {"spdx_id": "MIT"},
                    "pushed_at": "2026-06-01T00:00:00Z",
                    "created_at": "2020-01-01T00:00:00Z",
                    "language": "Rust",
                    "topics": [],
                },
                "enrichment": {
                    "scorecard": None,
                    "advisories": [],
                    "has_high": False,
                    "has_critical": False,
                },
                "pc_details": {"stack": "Rust", "win_install_bytes": None},
                "score_total": 0.7,
                "safety_score": 0.5,
                "pop_score": 0.6,
                "maint_score": 1.0,
                "pc_score": 0.8,
            }
        ],
    }


def test_search_empty_query_returns_400():
    client = TestClient(create_app())
    resp = client.get("/api/search?q=")
    assert resp.status_code == 400


def test_search_happy_path(mocker):
    mocker.patch("app.api.search.pipeline.run", return_value=_ok_pipeline_result())
    mocker.patch("app.api.search.search.get_token", return_value=None)
    client = TestClient(create_app())
    resp = client.get("/api/search?q=markdown+editor&limit=5")
    assert resp.status_code == 200
    body = resp.json()
    assert body["ok"] is True
    assert body["query"] == "markdown editor"
    assert body["top"][0]["full_name"] == "a/b"
    assert body["top"][0]["license"] == "MIT"
    assert body["dropped"][0]["reason"] == "archived"
    assert body["auth"] is False
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && python -m pytest tests/test_api_search.py -v`
Expected: FAIL (app.api.search not found).

- [ ] **Step 3: Create `backend/app/api/search.py`**

```python
"""Search route — wraps the discovery pipeline."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.models.schemas import SearchResponse
from app.serializers import serialize_dropped, serialize_item
from app.services import pipeline, search

router = APIRouter()


@router.get("/search", response_model=SearchResponse)
def api_search(
    q: str = Query(default=""),
    limit: int = Query(default=5, ge=1, le=20),
    relaxed: bool = Query(default=False),
    refresh: bool = Query(default=False),
) -> SearchResponse:
    query = q.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query is empty.")

    token = search.get_token()
    result = pipeline.run(
        query, limit=limit, relaxed=relaxed, refresh=refresh, token=token
    )

    if not result.get("ok") and result.get("error_kind") == "rate_limit":
        raise HTTPException(status_code=429, detail=result.get("error"))
    if not result.get("ok") and result.get("error_kind") == "network":
        raise HTTPException(status_code=502, detail=result.get("error"))

    return SearchResponse(
        ok=result["ok"],
        error=result.get("error"),
        error_kind=result.get("error_kind"),
        query=query,
        considered=result.get("considered", 0),
        dropped=serialize_dropped(result.get("dropped", [])),
        top=[serialize_item(x) for x in result.get("top", [])],
        auth=bool(token),
    )
```

- [ ] **Step 4: Mount the router — modify `backend/app/main.py`**

Change the imports line `from app.api import health` to:
```python
from app.api import health, search
```
And add, after the health router include:
```python
    app.include_router(search.router, prefix="/api")
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd backend && python -m pytest tests/test_api_search.py -v`
Expected: PASS (both tests).

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/search.py backend/app/main.py backend/tests/test_api_search.py
git commit -m "feat(backend): /api/search endpoint over the pipeline"
```

---

## Task 5: Single-repo fetch + `/api/repo/{owner}/{name}`

**Files:**
- Modify: `backend/app/services/search.py` (add `get_repo`)
- Modify: `backend/app/services/pipeline.py` (add `enrich_repo`; expose `_enrich_one` reuse)
- Create: `backend/app/api/repo.py`
- Modify: `backend/app/main.py` (mount the repo router)
- Test: `backend/tests/test_api_repo.py`

- [ ] **Step 1: Add `get_repo` to `backend/app/services/search.py`**

Append this function (uses the existing `_request`, `GH_API`, `cache`):
```python
def get_repo(
    full_name: str, *, token: str | None = None, refresh: bool = False
) -> dict[str, Any] | None:
    """Fetch a single repo's metadata, or None if not found."""
    if not refresh:
        cached = cache.get("repo", full_name)
        if cached is not None:
            return cached
    data = _request(f"{GH_API}/repos/{full_name}", token)
    if data is None:
        return None
    cache.put("repo", full_name, data)
    return data
```

- [ ] **Step 2: Add `enrich_repo` to `backend/app/services/pipeline.py`**

Append this function (reuses the existing module-level `_enrich_one`):
```python
def enrich_repo(
    full_name: str, *, token: str | None = None, refresh: bool = False
) -> dict[str, Any] | None:
    """Fetch + enrich + score a single repo. Returns a scored item or None."""
    repo = search.get_repo(full_name, token=token, refresh=refresh)
    if repo is None:
        return None
    # GitHub repo objects from /repos already include topics when requested via
    # the default media type on modern API versions; default to [] if absent.
    repo.setdefault("topics", repo.get("topics", []))
    return _enrich_one(repo, token=token, refresh=refresh)
```

- [ ] **Step 3: Write the failing test `backend/tests/test_api_repo.py`**

```python
from fastapi.testclient import TestClient

from app.main import create_app


def _scored_item():
    return {
        "repo": {
            "full_name": "a/b",
            "html_url": "https://github.com/a/b",
            "description": "d",
            "stargazers_count": 1000,
            "license": {"spdx_id": "MIT"},
            "pushed_at": "2026-06-01T00:00:00Z",
            "created_at": "2020-01-01T00:00:00Z",
            "language": "Rust",
            "topics": [],
        },
        "enrichment": {
            "scorecard": None,
            "advisories": [],
            "has_high": False,
            "has_critical": False,
        },
        "pc_details": {"stack": "Rust", "win_install_bytes": None},
        "score_total": 0.7,
        "safety_score": 0.5,
        "pop_score": 0.6,
        "maint_score": 1.0,
        "pc_score": 0.8,
    }


def test_repo_found(mocker):
    mocker.patch("app.api.repo.pipeline.enrich_repo", return_value=_scored_item())
    mocker.patch("app.api.repo.search.get_token", return_value=None)
    client = TestClient(create_app())
    resp = client.get("/api/repo/a/b")
    assert resp.status_code == 200
    assert resp.json()["full_name"] == "a/b"


def test_repo_not_found(mocker):
    mocker.patch("app.api.repo.pipeline.enrich_repo", return_value=None)
    mocker.patch("app.api.repo.search.get_token", return_value=None)
    client = TestClient(create_app())
    resp = client.get("/api/repo/no/such")
    assert resp.status_code == 404
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `cd backend && python -m pytest tests/test_api_repo.py -v`
Expected: FAIL (app.api.repo not found).

- [ ] **Step 5: Create `backend/app/api/repo.py`**

```python
"""Single-repo detail route."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.models.schemas import RepoResult
from app.serializers import serialize_item
from app.services import pipeline, search

router = APIRouter()


@router.get("/repo/{owner}/{name}", response_model=RepoResult)
def api_repo(owner: str, name: str) -> RepoResult:
    full_name = f"{owner}/{name}"
    token = search.get_token()
    try:
        item = pipeline.enrich_repo(full_name, token=token)
    except search.RateLimitError as e:
        raise HTTPException(status_code=429, detail=str(e))
    except search.NetworkError as e:
        raise HTTPException(status_code=502, detail=str(e))
    if item is None:
        raise HTTPException(status_code=404, detail=f"Repo {full_name} not found.")
    return RepoResult(**serialize_item(item))
```

- [ ] **Step 6: Mount the router — modify `backend/app/main.py`**

Change `from app.api import health, search` to:
```python
from app.api import health, repo, search
```
And add after the search router include:
```python
    app.include_router(repo.router, prefix="/api")
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `cd backend && python -m pytest tests/test_api_repo.py -v`
Expected: PASS (both tests).

- [ ] **Step 8: Commit**

```bash
git add backend/app/services/search.py backend/app/services/pipeline.py backend/app/api/repo.py backend/app/main.py backend/tests/test_api_repo.py
git commit -m "feat(backend): /api/repo/{owner}/{name} detail endpoint"
```

---

## Task 6: Full suite green + run config + docker-compose

**Files:**
- Create: `backend/.env.example`
- Create: `backend/README.md`
- Create: `docker-compose.yml`
- Create: `.gitignore` (repo root, if absent)

- [ ] **Step 1: Run the entire backend test suite**

Run: `cd backend && python -m pytest -v`
Expected: PASS — all ported pipeline tests + serializer + 3 API route files green. No failures.

- [ ] **Step 2: Manual smoke test the live server (optional, needs network)**

Run: `cd backend && python -m app.main` then in another shell: `curl http://127.0.0.1:8000/api/health`
Expected: `{"status":"ok","service":"vouch-backend"}`. Stop with Ctrl+C.

- [ ] **Step 3: Create `backend/.env.example`**

```
# Optional free GitHub PAT (raises rate limit 60/hr -> 5000/hr). Read-only public.
VOUCH_GITHUB_TOKEN=
# Comma-separated allowed frontend origins.
VOUCH_CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

- [ ] **Step 4: Create `backend/README.md`**

```markdown
# VOUCH backend

FastAPI service wrapping the find_oss discovery pipeline.

## Run
    pip install -e .[dev]
    python -m app.main        # http://127.0.0.1:8000  (docs at /docs)

## Endpoints
- `GET /api/health`
- `GET /api/search?q=<query>&limit=5&relaxed=false&refresh=false`
- `GET /api/repo/{owner}/{name}`

## Test
    python -m pytest -v

## Auth (free, optional)
Set `VOUCH_GITHUB_TOKEN` (or `GITHUB_TOKEN`) to a free read-only PAT to raise the
GitHub rate limit. Works without one (60 req/hr).
```

- [ ] **Step 5: Create root `docker-compose.yml`**

```yaml
services:
  backend:
    build: ./backend
    working_dir: /app
    command: python -m app.main
    environment:
      - VOUCH_CORS_ORIGINS=http://localhost:3000
    ports:
      - "8000:8000"
```

Note: the `backend/Dockerfile` is added in the deploy plan (Plan 5); compose is staged here for later use. This step only creates the compose file.

- [ ] **Step 6: Create/confirm root `.gitignore`**

```
__pycache__/
*.pyc
.pytest_cache/
*.db
.env
node_modules/
.next/
dist/
build/
*.egg-info/
```

- [ ] **Step 7: Commit**

```bash
git add backend/.env.example backend/README.md docker-compose.yml .gitignore
git commit -m "chore(backend): env example, README, compose stub, gitignore"
```

---

## Done criteria for Plan 1

- `cd backend && python -m pytest -v` is fully green.
- `python -m app.main` serves `/api/health`, `/api/search`, `/api/repo/{owner}/{name}`, with Swagger at `/docs`.
- `find_oss` logic untouched in behavior (same scoring, same filters), now importable as `app.services`.
- Zero paid dependencies. No remote push yet (private repo deferred to Plan 5 deploy).

**Next plan:** `Plan 2 — Frontend core` (Next.js landing/search/detail/compare against this API).
