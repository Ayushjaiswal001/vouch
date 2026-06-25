# VOUCH — Autonomous Deploy Plan

> **FULLY SELF-CONTAINED. No human input required after launch.**
> All decisions are pre-made. All credentials are referenced by exact env-var names.
> Execute every step in order. Never skip a verification step.

---

## Project context (read fully before doing anything)

**Repo:** `D:\vouch` — git on branch `main`, working tree clean.
**Product:** VOUCH (Vetted Open-source Utilities & Comparison Hub) — Next.js 16 frontend + FastAPI backend. Discovery engine for safe OSS tools. All code is complete (Plans 1–4 done).

**Monorepo layout (what exists right now):**
```
D:\vouch\
  backend/                        # FastAPI service (Python 3.12)
    app/
      main.py                     # BUG: host hardcoded "127.0.0.1" → FIX IN TASK 1
      core/config.py              # env prefix VOUCH_ ; settings.github_token etc.
      api/{health,search,repo,recommend}.py
      services/{pipeline,search,safety,score,filters,pc_fit,cache,report}.py
      ai/{provider,compare}.py
      models/schemas.py
      serializers.py
    tests/                        # 51 passing tests
    pyproject.toml                # name=vouch-backend; entry: python -m app.main
  frontend/                       # Next.js 16 + React 19 + Tailwind v4
    app/{page,layout,globals.css}
    app/search/{SearchClient,HomeTabs}.tsx
    app/repo/[owner]/[name]/page.tsx
    app/compare/page.tsx
    app/vs/{page,[slug]/page}.tsx
    app/{sitemap,robots}.ts
    components/{ScoreBar,ScoreCard,RepoCard,Stars,VsComparison,AIRecommend}.tsx
    lib/{api,comparisons,format}.ts
    package.json                  # scripts: dev/build/start/lint/typecheck/test
    vitest.config.ts              # 19 passing tests
  strategy/
    accelerator-tracker.md
    90-day-sprint.md
  docs/specs/2026-06-20-vouch-design.md
  docs/plans/*.md
  docker-compose.yml              # has WARNING comment; backend/Dockerfile MISSING → create in Task 2
  .gitignore                      # covers __pycache__, .env, *.db, node_modules, .next
  render.yaml                     # DOES NOT EXIST YET → create in Task 2
  README.md                       # DOES NOT EXIST YET → create in Task 4
```

**Hard rules (never violate):**
- $0 to build and run. No credit card, no paid tier.
- Repo must be PRIVATE on GitHub.
- Never commit `.env` or any secret. Only `.env.example` files.
- `VOUCH_GITHUB_TOKEN` and `VOUCH_LLM_API_KEY` are optional. The product works without them.

**Environment variables — the complete map:**

| Variable | Where set | Required | Value at deploy |
|---|---|---|---|
| `VOUCH_CORS_ORIGINS` | Render env dashboard | Yes | `https://<vercel-url>` (set AFTER Vercel deploys) |
| `VOUCH_GITHUB_TOKEN` | Render env dashboard | No (recommended) | Free GitHub PAT (read-only public repos) |
| `VOUCH_LLM_API_KEY` | Render env dashboard | No | Free Groq API key |
| `VOUCH_LLM_BASE_URL` | Render env (optional) | No | `https://api.groq.com/openai/v1` (default) |
| `VOUCH_LLM_MODEL` | Render env (optional) | No | `llama-3.3-70b-versatile` (default) |
| `NEXT_PUBLIC_API_BASE` | Vercel env dashboard | Yes | `https://<render-service-name>.onrender.com` |
| `NEXT_PUBLIC_SITE_URL` | Vercel env dashboard | Yes | `https://<vercel-project>.vercel.app` |

**Tools expected on PATH:**
- `git` (already used — confirmed working)
- `python` (3.12, confirmed)
- `npm` / `npx` (Node 24, confirmed)
- `gh` (GitHub CLI) — needed for Task 5. Run `gh --version` to check. If missing: `winget install --id GitHub.cli` or download from https://cli.github.com. Then `gh auth login` — choose GitHub.com → HTTPS → authenticate via browser.
- `curl` (available in Git Bash; confirmed used in this project)

All git commands run from `D:\vouch`. All Python commands run from `D:\vouch\backend`. All npm commands run from `D:\vouch\frontend`. Working directory must match — never assume cwd.

---

## Task 1 — Fix backend entrypoint to bind on $PORT (REQUIRED before deploy)

The Opus code reviewer flagged `backend/app/main.py:33` hardcodes `host="127.0.0.1"` — unreachable inside a container or Render's runtime. Fix it now.

**Files modified:** `backend/app/main.py`, `backend/tests/test_main_run.py` (new)

### Step 1: Write the failing test

Create `D:\vouch\backend\tests\test_main_run.py` with exact contents:

```python
"""Tests that run() honours $PORT and binds to 0.0.0.0."""

import os
import app.main as main_module


def test_run_binds_all_interfaces_and_honours_port(monkeypatch):
    captured = {}

    def fake_uvicorn_run(app_path: str, **kwargs: object) -> None:
        captured["app_path"] = app_path
        captured.update(kwargs)

    monkeypatch.setenv("PORT", "12345")
    monkeypatch.setattr(main_module, "_uvicorn_run", fake_uvicorn_run)
    main_module.run()
    assert captured["host"] == "0.0.0.0", f"host was {captured.get('host')}"
    assert captured["port"] == 12345, f"port was {captured.get('port')}"
    assert captured["app_path"] == "app.main:app"


def test_run_defaults_to_port_8000(monkeypatch):
    captured = {}
    monkeypatch.delenv("PORT", raising=False)
    monkeypatch.setattr(
        main_module, "_uvicorn_run",
        lambda app_path, **k: captured.update({"port": k["port"]})
    )
    main_module.run()
    assert captured["port"] == 8000
```

### Step 2: Run — expect FAIL

```
cd D:\vouch\backend && python -m pytest tests/test_main_run.py -v
```
Expected output contains `FAILED` and `AttributeError: module 'app.main' has no attribute '_uvicorn_run'`.

If it passes immediately, something is wrong — stop and investigate before continuing.

### Step 3: Patch `backend/app/main.py`

Replace the entire file with:

```python
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
```

### Step 4: Run test — expect PASS

```
cd D:\vouch\backend && python -m pytest tests/test_main_run.py -v
```
Expected: `2 passed`.

### Step 5: Run full backend suite — expect 53 passed

```
cd D:\vouch\backend && python -m pytest -q
```
Expected last line: `53 passed, 1 warning in ...s`

If count differs, read the failure output fully before proceeding. Do not continue with a failing suite.

### Step 6: Commit

```
cd D:\vouch && git add backend/app/main.py backend/tests/test_main_run.py
git commit -m "fix(backend): bind 0.0.0.0 and honour \$PORT for container/Render deploy"
```
Expected: `[main <sha>] fix(backend): bind 0.0.0.0 and honour $PORT for container/Render deploy`

---

## Task 2 — Backend Dockerfile + Render blueprint

**Files created:** `backend/Dockerfile`, `backend/.dockerignore`, `render.yaml`

### Step 1: Create `backend/Dockerfile`

```dockerfile
FROM python:3.12-slim

# Never buffer Python output so Render's log stream is live.
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Copy only the package descriptor first so pip layer caches between code changes.
COPY pyproject.toml ./
COPY app ./app

RUN pip install --no-cache-dir -e .

EXPOSE 8000

# $PORT injected by Render/Fly at runtime; defaults to 8000 if absent.
CMD ["python", "-m", "app.main"]
```

### Step 2: Create `backend/.dockerignore`

```
tests/
__pycache__/
*.pyc
*.db
.env
.pytest_cache/
*.egg-info/
```

### Step 3: Create `render.yaml` at `D:\vouch\render.yaml`

This is the Render Blueprint — Render reads it automatically when the repo is connected.

```yaml
# Render Blueprint — see https://render.com/docs/blueprint-spec
services:
  - type: web
    name: vouch-api
    runtime: python
    rootDir: backend
    plan: free
    buildCommand: pip install -e .
    startCommand: python -m app.main
    healthCheckPath: /api/health
    envVars:
      # Set these in the Render dashboard after creating the service.
      # They are listed here as sync:false so Render knows they exist
      # but does NOT sync a value from this file (no secrets in git).
      - key: VOUCH_CORS_ORIGINS
        sync: false
      - key: VOUCH_GITHUB_TOKEN
        sync: false
      - key: VOUCH_LLM_API_KEY
        sync: false
      - key: VOUCH_LLM_BASE_URL
        sync: false
      - key: VOUCH_LLM_MODEL
        sync: false
```

### Step 4: Verify Dockerfile builds locally (skip if Docker Desktop not installed)

```
cd D:\vouch\backend && docker build -t vouch-api:local . 2>&1 | tail -5
```
Expected last line: `Successfully built <sha>` or similar. A `successfully tagged` line is fine.

If Docker is not installed: skip this step entirely. Render will build from the file directly; local Docker build is a convenience check only.

### Step 5: Commit

```
cd D:\vouch && git add backend/Dockerfile backend/.dockerignore render.yaml
git commit -m "chore(deploy): Dockerfile + Render blueprint (render.yaml)"
```

---

## Task 3 — Frontend production env docs

**Files created:** `frontend/.env.production.example`
**Files modified:** `frontend/README.md`

### Step 1: Create `frontend/.env.production.example`

```
# Copy to .env.production.local for local prod-build testing.
# Set these as Environment Variables in the Vercel project (Production + Preview scopes).

# URL of the deployed FastAPI backend (Render). No trailing slash.
NEXT_PUBLIC_API_BASE=https://vouch-api.onrender.com

# Public URL of this site (Vercel). Used for canonical links, sitemap, OG.
# After the first Vercel deploy, update this to the real URL, then redeploy.
NEXT_PUBLIC_SITE_URL=https://vouch.vercel.app
```

### Step 2: Append to `frontend/README.md`

Append the following to the end of the file (do not remove anything existing):

```markdown

## Deploy (Vercel — free)

1. Go to vercel.com → New Project → Import the private GitHub repo.
2. **Root Directory:** `frontend` (required — Vercel auto-detects Next.js from here).
3. **Environment Variables (Production + Preview):**
   - `NEXT_PUBLIC_API_BASE` = the Render backend URL (e.g. `https://vouch-api.onrender.com`)
   - `NEXT_PUBLIC_SITE_URL` = the Vercel project URL (e.g. `https://vouch.vercel.app`)
4. Click **Deploy**.
5. After the first deploy succeeds, add your Vercel URL to the Render service's
   `VOUCH_CORS_ORIGINS` env var, then redeploy the backend.
```

### Step 3: Run frontend gates

```
cd D:\vouch\frontend && npm run typecheck && npm run build 2>&1 | tail -10
```
Expected: typecheck clean, build succeeds, same 8-route list as before.

### Step 4: Commit

```
cd D:\vouch && git add frontend/.env.production.example frontend/README.md
git commit -m "chore(deploy): frontend Vercel env example + deploy notes"
```

---

## Task 4 — Root README + DEPLOY runbook

**Files created:** `README.md`, `DEPLOY.md` at the repo root.

### Step 1: Create `D:\vouch\README.md`

```markdown
# VOUCH — Vetted Open-source Utilities & Comparison Hub

> Product Hunt meets a trust scanner for open source: discover, compare, and
> trust-check any open-source tool in seconds.

**Live:** _set after deploy_

## What it does

Choosing open-source tools means guessing from GitHub stars. VOUCH scores every
candidate on:
- **Safety** — OSSF Scorecard, open advisories, license.
- **Maintenance** — commit recency, release cadence.
- **Popularity** — stars (log-scaled).
- **Lightweight** — native vs Electron, install size.

Then it explains the score, runs an AI comparison on top, and serves SEO-optimised
`/vs/tauri-vs-electron`-style pages with full structured data.

## Architecture

```
Browser ──> Vercel (frontend/, Next.js 16) ──> Render (backend/, FastAPI)
                                                      │
                                          GitHub REST + OSSF Scorecard
                                          (optional: Groq LLM free tier)
```

## Run locally

```bash
# backend (http://localhost:8000, Swagger at /docs)
cd backend && pip install -e .[dev] && python -m app.main

# frontend — new shell (http://localhost:3000)
cd frontend && npm install && npm run dev
```

## Test

```bash
cd backend && python -m pytest -q          # 53 backend tests
cd frontend && npm run test -- --run       # 19 frontend tests
```

## Cost

**$0/month** — Vercel Hobby + Render free tier + free public APIs.
No credit card required anywhere. See [DEPLOY.md](DEPLOY.md) for the full setup.

## Strategy

Built for the India dev ecosystem. See [`strategy/`](strategy/) for the
accelerator-tracker and 90-day sprint plan.
```

### Step 2: Create `D:\vouch\DEPLOY.md`

```markdown
# Deploying VOUCH ($0, no credit card)

## Prerequisites — all free

| Tool | Why | Get it |
|---|---|---|
| GitHub account | hosts the private repo | github.com |
| `gh` CLI, authenticated | push repo via CLI | `winget install GitHub.cli`, then `gh auth login` |
| Render account | hosts the FastAPI backend | render.com (no card on free plan) |
| Vercel account | hosts the Next.js frontend | vercel.com (no card on Hobby plan) |
| GitHub PAT (optional, recommended) | raises GitHub API rate limit 60/hr → 5000/hr | GitHub → Settings → Developer settings → Fine-grained tokens → read-only, public repos |
| Groq API key (optional) | enables AI prose in /api/recommend | console.groq.com → free tier, no card |

---

## Step 1 — Push to a private GitHub repo

```bash
cd D:\vouch
gh repo create vouch --private --source=. --remote=origin --push
```

Verify: go to github.com/<your-username>/vouch — it should show 🔒 Private.

---

## Step 2 — Deploy backend on Render

**Option A — Blueprint (recommended, one click):**
1. Render dashboard → New → Blueprint.
2. Connect your GitHub account, select the `vouch` repo.
3. Render finds `render.yaml` automatically and creates the `vouch-api` service.
4. Click **Apply**.

**Option B — Manual web service:**
1. Render → New → Web Service.
2. Connect repo → select `vouch`.
3. Settings:
   - Root Directory: `backend`
   - Runtime: Python 3
   - Build Command: `pip install -e .`
   - Start Command: `python -m app.main`
   - Plan: **Free**
   - Health Check Path: `/api/health`
4. Click Create Web Service.

**Set environment variables** (in the Render service → Environment tab):

| Key | Value |
|---|---|
| `VOUCH_GITHUB_TOKEN` | your free PAT (recommended) |
| `VOUCH_LLM_API_KEY` | your free Groq key (optional) |
| `VOUCH_CORS_ORIGINS` | _set in Step 4_ |

**Wait for deploy to finish.** URL will be: `https://vouch-api.onrender.com`
(or similar — note the exact URL for Step 3).

**Verify:** `curl https://vouch-api.onrender.com/api/health`
Expected: `{"status":"ok","service":"vouch-backend"}`

---

## Step 3 — Deploy frontend on Vercel

1. Vercel → Add New → Project.
2. Import Git Repository → select `vouch`.
3. **Root Directory:** `frontend` ← critical, must be set.
4. Framework: Next.js (auto-detected).
5. Environment Variables (Production + Preview scope):
   - `NEXT_PUBLIC_API_BASE` = `https://vouch-api.onrender.com` (your Render URL)
   - `NEXT_PUBLIC_SITE_URL` = `https://vouch.vercel.app` (your Vercel URL, set before deploying if known; update after if not)
6. Click **Deploy**.

**Wait for build.** Vercel builds Next.js; build log should show `Compiled successfully`.
URL will be: `https://vouch.vercel.app` (or your chosen name).

---

## Step 4 — Wire CORS

Now that you have the Vercel URL, go back to Render:
- Environment → add/update `VOUCH_CORS_ORIGINS` = `https://vouch.vercel.app`
- Click **Save Changes** → Render auto-redeploys the backend.

If you have multiple Vercel preview URLs you want to allow, comma-separate them:
`https://vouch.vercel.app,https://vouch-git-main-yourname.vercel.app`

---

## Step 5 — Smoke test (live)

Run these checks. First request to Render may be slow (cold start ~30-60s on free tier — expected).

```bash
# Backend health
curl https://vouch-api.onrender.com/api/health
# → {"status":"ok","service":"vouch-backend"}

# Search (real GitHub data)
curl "https://vouch-api.onrender.com/api/search?q=markdown+editor&limit=3"
# → {"ok":true,"top":[...],"considered":...}

# Frontend landing (should return HTML with "Find open-source tools")
curl -s https://vouch.vercel.app | grep -o "Find open-source tools you can trust"
# → Find open-source tools you can trust

# SEO comparison page (SSR from live data; may be slow first hit)
curl -s https://vouch.vercel.app/vs/tauri-vs-electron | grep -oE "tauri-apps/tauri|Trust score|application/ld.json" | sort -u
# → application/ld+json  Trust score  tauri-apps/tauri

# Sitemap
curl -s https://vouch.vercel.app/sitemap.xml | grep -o "/vs/tauri-vs-electron"
# → /vs/tauri-vs-electron
```

If any check fails, see the Troubleshooting section below.

---

## Step 6 — Optional: keep Render warm (prevents cold starts)

Render's free tier spins down after ~15 min idle. A free cron pinger prevents this:

1. Go to [cron-job.org](https://cron-job.org) (free, no card).
2. Create a cron job: URL = `https://vouch-api.onrender.com/api/health`, interval = every 10 minutes.
3. Done. The first request to your site will no longer cold-start.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Frontend search returns CORS error in browser console | `VOUCH_CORS_ORIGINS` on Render not set to Vercel URL | Step 4 — set and redeploy backend |
| `/vs/tauri-vs-electron` shows "Not found" | Backend cold start timeout (free tier) | Retry after 60s; add keep-warm (Step 6) |
| `curl /api/search` returns 429 | GitHub rate limit, no PAT set | Add `VOUCH_GITHUB_TOKEN` (free PAT) on Render |
| Vercel build fails | Wrong Root Directory | Ensure Root Directory = `frontend` in Vercel project settings |
| Backend deploy fails on Render | Build command issue | Check Render build logs; confirm `rootDir: backend` in render.yaml |
| AI recommend shows "Heuristic ranking" | No LLM key (expected — product works fine) | Optional: add `VOUCH_LLM_API_KEY` (free Groq key) on Render |

---

## After deploy — update README

Edit `README.md` at the repo root: replace `_set after deploy_` under **Live** with the real Vercel URL. Push. Vercel redeploys automatically.
```

### Step 3: Commit

```
cd D:\vouch && git add README.md DEPLOY.md
git commit -m "docs: root README + $0 deploy runbook (DEPLOY.md)"
```

---

## Task 5 — Create private GitHub repo and push

**This is the first outward-facing step. It creates a real remote. Confirm `gh` is authenticated before running.**

### Step 1: Verify `gh` is authenticated

```
gh auth status
```
Expected output contains: `Logged in to github.com account <your-username>`.

If NOT authenticated: run `gh auth login` → choose `GitHub.com` → `HTTPS` → `Login with a web browser` → follow the browser prompt. Then re-run `gh auth status` and confirm before continuing.

### Step 2: Create the private repo and push

```
cd D:\vouch && gh repo create vouch --private --source=. --remote=origin --push
```

This command:
1. Creates a **private** repo named `vouch` under your account.
2. Sets `origin` to point at it.
3. Pushes all commits on `main`.

Expected output contains: `✓ Created repository <username>/vouch on GitHub` and `✓ Pushed commits to https://github.com/<username>/vouch.git`.

If the repo name `vouch` is already taken in your account: use `gh repo create vouch-app --private --source=. --remote=origin --push` and substitute `vouch-app` everywhere the URL appears.

### Step 3: Verify the push

```
gh repo view --web
```
Opens the repo in the browser. Confirm:
- Lock icon (🔒 Private)
- Latest commit message matches the most recent commit (`docs: root README + $0 deploy runbook`)
- File tree shows `backend/`, `frontend/`, `strategy/`, `render.yaml`, `README.md`, `DEPLOY.md`

---

## Task 6 — Deploy backend on Render

**Render free plan, no credit card.**

### Step 1: Set up Render service via Blueprint

The exact steps must be done in the Render web UI (no CLI for the free plan's initial setup):

1. Go to **dashboard.render.com**.
2. Click **New** → **Blueprint**.
3. Click **Connect a repository** → authorize Render to access your GitHub account → select the `vouch` repo.
4. Render reads `render.yaml` and shows a service named `vouch-api`.
5. Click **Apply**.
6. Wait for the build. Build logs stream in the dashboard. Expected build output: `Successfully installed vouch-backend...`. Build time: ~2-3 minutes.
7. Note the service URL shown at the top of the service page: `https://vouch-api.onrender.com` (may differ if the name is taken — use whatever Render assigns).

**If Blueprint fails** (render.yaml parse error or Render doesn't detect it): use Manual setup:
- New → Web Service → Connect repo `vouch` → Root Directory `backend` → Runtime `Python 3` → Build `pip install -e .` → Start `python -m app.main` → Plan `Free` → Health Check `/api/health`.

### Step 2: Set environment variables in Render

In the service → **Environment** tab → **Add Environment Variable**:

| Key | Value | Notes |
|---|---|---|
| `VOUCH_GITHUB_TOKEN` | `<your free GitHub PAT>` | From GitHub → Settings → Developer settings → Fine-grained tokens. Permissions: read-only on "public repositories". Copy the token (shown once). |
| `VOUCH_LLM_API_KEY` | `<your free Groq key>` | From console.groq.com → API Keys → Create new key. Optional — skip if you don't have one yet. |

Do NOT set `VOUCH_CORS_ORIGINS` yet — you don't have the Vercel URL. Set it in Task 8.

Click **Save Changes**. Render redeploys automatically.

### Step 3: Verify backend live

Wait for the redeploy (watch the Events log in Render — look for `Deploy live for vouch-api`).

```
curl https://vouch-api.onrender.com/api/health
```
Expected: `{"status":"ok","service":"vouch-backend"}`

If the first curl times out: wait 60 seconds and retry (cold start). If it still fails after 3 tries, check the Render logs tab for errors.

Note the exact backend URL for the next task.

---

## Task 7 — Deploy frontend on Vercel

**Vercel Hobby plan, no credit card.**

### Step 1: Import project on Vercel

1. Go to **vercel.com/new**.
2. Click **Import Git Repository** → authorize Vercel to access your GitHub account → select `vouch`.
3. **Root Directory:** Click "Edit" → type `frontend`. This is critical — without it, Vercel tries to build the monorepo root, which has no `package.json`, and fails.
4. Framework Preset: **Next.js** (auto-detected once Root Directory is set).
5. **Environment Variables** — before clicking Deploy, add:

   | Name | Value | Environment |
   |---|---|---|
   | `NEXT_PUBLIC_API_BASE` | `https://vouch-api.onrender.com` | Production, Preview |
   | `NEXT_PUBLIC_SITE_URL` | `https://vouch.vercel.app` | Production, Preview |

   Replace URLs with the actual ones if different.

6. Click **Deploy**.

### Step 2: Wait for build

Vercel streams build logs. The build runs `npm run build` in the `frontend/` directory. Expected:
- `Compiled successfully in ...s`
- `Generating static pages (8/8)`
- `Deployment complete`

Build time: ~2-4 minutes. If the build fails, read the log — the most common cause is wrong Root Directory.

### Step 3: Note the deployed URL

Vercel shows the URL after deploy: e.g. `https://vouch.vercel.app`.
If it shows a preview URL like `https://vouch-git-main-user.vercel.app`, the canonical domain is usually `https://vouch.vercel.app` — check the Deployments tab for the Production URL.

**If `NEXT_PUBLIC_SITE_URL` you set doesn't match the actual Vercel URL:** go to Vercel → Project → Settings → Environment Variables → update `NEXT_PUBLIC_SITE_URL` to the real URL → trigger a redeploy (Deployments → Redeploy).

---

## Task 8 — Wire CORS and final smoke test

### Step 1: Set VOUCH_CORS_ORIGINS on Render

Now that you have the real Vercel URL:

1. Render dashboard → `vouch-api` service → **Environment** tab.
2. Add or update `VOUCH_CORS_ORIGINS` = `https://vouch.vercel.app` (your actual Vercel URL).
3. Click **Save Changes**. Render redeploys.

### Step 2: Wait for Render redeploy

Watch the Events tab in Render. Wait for `Deploy live for vouch-api`. Takes ~1-2 minutes.

### Step 3: Full smoke test

Run all of the following. Replace URLs with your actual deployed URLs.

```bash
# 1. Backend health
curl -s https://vouch-api.onrender.com/api/health
# Expected: {"status":"ok","service":"vouch-backend"}

# 2. Backend search (real GitHub data)
curl -s "https://vouch-api.onrender.com/api/search?q=markdown+editor&limit=3" | python -c "import sys,json; d=json.load(sys.stdin); print('ok:', d['ok'], '| top:', len(d['top']), '| considered:', d.get('considered'))"
# Expected: ok: True | top: 3 | considered: <number>

# 3. Backend recommend (fallback mode — no LLM key needed)
curl -s -X POST https://vouch-api.onrender.com/api/recommend -H "Content-Type: application/json" -d '{"query":"markdown editor","limit":3}' | python -c "import sys,json; d=json.load(sys.stdin); print('mode:', d['mode'], '| picks:', len(d['picks']))"
# Expected: mode: fallback | picks: 3   (or mode: ai if LLM key set)

# 4. Frontend landing (Next.js SSR)
curl -s https://vouch.vercel.app | grep -o "Find open-source tools you can trust"
# Expected: Find open-source tools you can trust

# 5. SEO comparison page (fetches from live backend during SSR)
curl -s https://vouch.vercel.app/vs/tauri-vs-electron | grep -oE "tauri-apps/tauri|Trust score|ld\+json" | sort -u
# Expected lines: ld+json   Trust score   tauri-apps/tauri

# 6. Unknown comparison slug (should 404)
curl -s -o /dev/null -w "%{http_code}" https://vouch.vercel.app/vs/fake-vs-nothing
# Expected: 404

# 7. Sitemap
curl -s https://vouch.vercel.app/sitemap.xml | grep -c "vs/"
# Expected: 6 (one per curated comparison)

# 8. Robots
curl -s https://vouch.vercel.app/robots.txt | grep "Sitemap"
# Expected: Sitemap: https://vouch.vercel.app/sitemap.xml
```

If any check fails:
- Backend health fails → Render not live; check Events tab.
- Search returns 429 → add `VOUCH_GITHUB_TOKEN` on Render.
- Frontend returns CORS error (visible in browser devtools, not curl) → `VOUCH_CORS_ORIGINS` not set correctly on Render; see Task 8 Step 1.
- `/vs/*` returns 404 from Render cold start → retry after 60s.
- `/vs/*` search still fails → check that `NEXT_PUBLIC_API_BASE` is the Render URL, not localhost.

### Step 4: Update README with live URL

```
cd D:\vouch
```
Edit `README.md`: find the line `**Live:** _set after deploy_` and replace `_set after deploy_` with the actual Vercel URL.

Then:
```
git add README.md && git commit -m "docs: add live URL to README"
git push origin main
```
Vercel picks up the push and redeploys automatically within ~2 minutes.

---

## Task 9 — Optional keep-warm + tidy

### Step 1: Set up free cron pinger (prevents 30-60s cold starts on Render)

1. Go to **cron-job.org** (free, no card required; takes <2 min to register).
2. Create account → Dashboard → **Create cronjob**.
3. URL: `https://vouch-api.onrender.com/api/health`
4. Schedule: every 10 minutes.
5. Save.

This hits the health endpoint every 10 min, keeping Render's container warm. Zero cost.

### Step 2: Submit site to Google Search Console (free, 5 min)

1. Go to **search.google.com/search-console**.
2. Add property → URL prefix → `https://vouch.vercel.app`.
3. Verify via the HTML file method (Vercel makes this easy: add a `public/<filename>.html` and push, or use the DNS method if you add a custom domain).
4. After verification, go to Sitemaps → add `sitemap.xml` → Submit.

This starts the SEO compounding clock for the `/vs/*` comparison pages.

### Step 3: Final commit (working tree clean)

```
cd D:\vouch && git status
```
Expected: `nothing to commit, working tree clean`

If there are uncommitted changes: add and commit with an appropriate message before pushing.

Push the final state:
```
git push origin main
```
Expected: `Everything up-to-date` or a push summary.

---

## Done criteria — the complete checklist

Phase A (code changes):
- [ ] `backend/app/main.py` → `run()` binds `0.0.0.0` and honours `$PORT`
- [ ] `backend/tests/test_main_run.py` exists, 2 tests pass
- [ ] Full backend suite: **53 passed**
- [ ] `backend/Dockerfile` exists with the exact contents above
- [ ] `backend/.dockerignore` exists
- [ ] `render.yaml` exists at repo root
- [ ] `frontend/.env.production.example` exists
- [ ] `frontend/README.md` has the Deploy section appended
- [ ] Frontend build still passes (`npm run build` succeeds)
- [ ] Root `README.md` exists (with live URL placeholder)
- [ ] Root `DEPLOY.md` exists (full step-by-step)
- [ ] Working tree clean; all changes committed

Phase B (deploy):
- [ ] `gh auth status` shows authenticated
- [ ] Private GitHub repo `vouch` created and all commits pushed
- [ ] Render `vouch-api` service live; `/api/health` returns 200
- [ ] `VOUCH_GITHUB_TOKEN` set on Render (optional but recommended)
- [ ] Vercel project live; Root Dir = `frontend`; `NEXT_PUBLIC_API_BASE` + `NEXT_PUBLIC_SITE_URL` set
- [ ] `VOUCH_CORS_ORIGINS` set on Render to the Vercel URL; backend redeployed
- [ ] All 8 smoke test commands pass
- [ ] README updated with live URL and pushed
- [ ] (Optional) cron-job.org keep-warm set up
- [ ] (Optional) Google Search Console + sitemap submitted

**When all boxes are checked: VOUCH v1 is live at $0, ready for the India accelerator demo.**
