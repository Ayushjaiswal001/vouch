# VOUCH Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans for **Phase A** only. **Phase B is a human-in-the-loop runbook** — it touches external accounts and must not be executed headless.

**Goal:** Ship VOUCH to the public internet at **$0/month** — private GitHub repo, FastAPI backend on a free host, Next.js frontend on Vercel — with all env wiring documented and the production build verified locally first.

**Status guard:** The repo owner has said **do not deploy yet**. This plan is written and committed; **Phase A** (local, reversible, $0, no external account) may be executed on approval; **Phase B** (creating the repo/services) is executed only with the owner, using the owner's accounts.

**Architecture (target):**
```
 Browser ──https──> Vercel (Next.js, frontend/)  ──https──> Render (FastAPI, backend/) ──> GitHub REST + OSSF + (optional) Groq
              NEXT_PUBLIC_API_BASE = https://<render-app>.onrender.com
              NEXT_PUBLIC_SITE_URL = https://<vercel-app>.vercel.app
   Render env: VOUCH_CORS_ORIGINS = https://<vercel-app>.vercel.app  (+ optional VOUCH_GITHUB_TOKEN, VOUCH_LLM_API_KEY)
```

**Cost & free-tier choices (per project hard rule — every paid step surfaced with a free alternative):**

| Need | Free choice (this plan) | Notes / free alternative |
|------|--------------------------|--------------------------|
| Source host | GitHub **private** repo | Free. Vercel + Render connect to private repos on free tiers. |
| Frontend host | **Vercel Hobby** | Free, no card. Alt: Cloudflare Pages (free). |
| Backend host | **Render** free web service | Free, **no credit card**. Spins down after ~15 min idle (cold start ~30-60s). Alt: Fly.io (free allowance but **asks for a card** to verify — flagged, not chosen). |
| GitHub API rate | unauth 60/hr → free **PAT** 5000/hr | Strongly recommended for a live demo; PAT is free, read-only public scope. |
| LLM | none needed; **Groq free tier** optional | Without a key, `/api/recommend` uses the deterministic fallback ($0). |
| DB | SQLite (ephemeral cache) | Fine; cache rebuilds. No paid DB. |

**No step in this plan requires payment.** The only "investment" is free account signups (GitHub/Vercel/Render) and optional free API keys; these are called out explicitly in Phase B.

---

## Phase A — Deploy prep (local, $0, no external accounts; safe to execute on approval)

### File Structure (Phase A)
```
vouch/
  backend/
    app/main.py        # MODIFY — run() binds 0.0.0.0 and honors $PORT
    Dockerfile         # NEW — portable backend image (Render/Fly/any)
    .dockerignore      # NEW
  render.yaml          # NEW — Render blueprint (native Python service)
  frontend/
    .env.production.example  # NEW — documents prod NEXT_PUBLIC_* vars
  docker-compose.yml   # MODIFY — point at the new Dockerfile (already references ./backend)
  README.md            # NEW — product-level README (pitch + architecture + run)
  DEPLOY.md            # NEW — the Phase B runbook
```

---

### Task A1: Production-ready server entrypoint

**Files:**
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_main_run.py`

- [ ] **Step 1: Write the failing test `backend/tests/test_main_run.py`**

```python
import app.main as main


def test_run_uses_port_and_binds_all_interfaces(monkeypatch):
    captured = {}

    def fake_run(app_path, **kwargs):
        captured["app_path"] = app_path
        captured.update(kwargs)

    monkeypatch.setenv("PORT", "12345")
    monkeypatch.setattr(main, "_uvicorn_run", fake_run)
    main.run()
    assert captured["host"] == "0.0.0.0"
    assert captured["port"] == 12345
    assert captured["app_path"] == "app.main:app"


def test_run_defaults_to_8000(monkeypatch):
    captured = {}
    monkeypatch.delenv("PORT", raising=False)
    monkeypatch.setattr(main, "_uvicorn_run", lambda app_path, **k: captured.update(k))
    main.run()
    assert captured["port"] == 8000
```

- [ ] **Step 2: Run it — expect FAIL** (`main._uvicorn_run` doesn't exist yet).

Run: `cd backend && python -m pytest tests/test_main_run.py -v`

- [ ] **Step 3: Update `backend/app/main.py`** — replace the `run()` function (and add the imports/seam):

Add `import os` at the top with the other imports. Replace the existing `run()` with:
```python
def _uvicorn_run(app_path: str, **kwargs: object) -> None:
    import uvicorn

    uvicorn.run(app_path, **kwargs)


def run() -> None:
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "8000"))
    _uvicorn_run("app.main:app", host=host, port=port, reload=False)
```

- [ ] **Step 4: Run the test — expect PASS.** Then full suite `python -m pytest -q` (expect 51: 49 + 2).

- [ ] **Step 5: Commit**

```bash
git add backend/app/main.py backend/tests/test_main_run.py
git commit -m "feat(backend): bind 0.0.0.0 and honor $PORT for hosted deploy"
```

---

### Task A2: Backend container + Render blueprint

**Files:**
- Create: `backend/Dockerfile`
- Create: `backend/.dockerignore`
- Create: `render.yaml`
- Modify: `docker-compose.yml` (confirm it builds the new Dockerfile)

- [ ] **Step 1: Create `backend/Dockerfile`**

```dockerfile
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
WORKDIR /app

COPY pyproject.toml ./
COPY app ./app
RUN pip install --no-cache-dir -e .

EXPOSE 8000
# Render/most PaaS inject $PORT; default 8000 locally.
CMD ["python", "-m", "app.main"]
```

- [ ] **Step 2: Create `backend/.dockerignore`**

```
tests/
__pycache__/
*.pyc
*.db
.env
.pytest_cache/
```

- [ ] **Step 3: Create `render.yaml` (repo root)** — native Python service (no Docker needed on Render; Dockerfile remains for Fly/local):

```yaml
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
      - key: VOUCH_CORS_ORIGINS
        sync: false   # set to the Vercel URL in the dashboard
      - key: VOUCH_GITHUB_TOKEN
        sync: false   # optional free PAT (read-only public) — raises rate limit
      - key: VOUCH_LLM_API_KEY
        sync: false   # optional free Groq key — enables AI prose
```

- [ ] **Step 4: Confirm `docker-compose.yml` builds the backend** (it already has `build: ./backend`). Bring it in line with the new CMD by ensuring the service has no stale `command:` override that conflicts; the compose `command: python -m app.main` is correct. No change needed unless it diverges.

- [ ] **Step 5: Local verification (no deploy)**

Build the image and run it on a custom port to prove the container + `$PORT` works:
```bash
cd backend && docker build -t vouch-api:local .
docker run --rm -e PORT=9000 -p 9000:9000 vouch-api:local &
sleep 5 && curl -s http://127.0.0.1:9000/api/health
# expect {"status":"ok","service":"vouch-backend"}; then stop the container.
```
(If Docker isn't installed, skip the container run and instead verify `PORT=9000 python -m app.main` serves on 9000 — the controller confirms either way.)

- [ ] **Step 6: Commit**

```bash
git add backend/Dockerfile backend/.dockerignore render.yaml docker-compose.yml
git commit -m "chore(deploy): backend Dockerfile + Render blueprint"
```

---

### Task A3: Frontend production env + config

**Files:**
- Create: `frontend/.env.production.example`
- Modify: `frontend/README.md` (deploy note)

- [ ] **Step 1: Create `frontend/.env.production.example`**

```
# Set these in the Vercel project (Production scope):
# URL of the deployed backend (Render), no trailing slash.
NEXT_PUBLIC_API_BASE=https://vouch-api.onrender.com
# Public URL of this site (Vercel), used for canonical/sitemap/robots.
NEXT_PUBLIC_SITE_URL=https://vouch.vercel.app
```

- [ ] **Step 2: Add a deploy note to `frontend/README.md`** under a new `## Deploy` section:

```markdown
## Deploy (Vercel)
- Import the repo in Vercel; set **Root Directory = `frontend`** (Vercel auto-detects Next.js).
- Set env vars `NEXT_PUBLIC_API_BASE` (Render backend URL) and `NEXT_PUBLIC_SITE_URL` (this site's URL).
- After the backend is live, set its `VOUCH_CORS_ORIGINS` to this site's URL.
```

- [ ] **Step 3: Verify the production build still passes** (`npm run build` from `frontend/`). No code change should be needed; this confirms env-driven config didn't regress.

- [ ] **Step 4: Commit**

```bash
git add frontend/.env.production.example frontend/README.md
git commit -m "chore(deploy): frontend production env example + Vercel notes"
```

---

### Task A4: Product README + DEPLOY runbook

**Files:**
- Create: `README.md` (repo root)
- Create: `DEPLOY.md` (repo root)

- [ ] **Step 1: Create root `README.md`** — the pitch + architecture + local run:

```markdown
# VOUCH — Vetted Open-source Utilities & Comparison Hub

Product Hunt meets a trust scanner for open source: discover, compare, and
trust-check any open-source tool in seconds, with AI-ranked recommendations and
a transparent safety/health score.

## Why
Picking open-source tools means squinting at stars and guessing about safety and
maintenance. VOUCH scores every candidate on safety (OSSF Scorecard + advisories),
popularity, maintenance, and how lightweight it is — then explains the score.

## Features
- **Trust scorecards** — explainable safety/maintenance/popularity/lightweight scores per repo.
- **AI compare & recommend** — natural-language → ranked picks with tradeoffs (free-tier LLM; deterministic fallback at $0).
- **SEO comparison pages** — `/vs/tauri-vs-electron`-style server-rendered pages with structured data.

## Architecture
- `backend/` — FastAPI wrapping a discovery pipeline (GitHub REST + OSSF Scorecard). REST/JSON.
- `frontend/` — Next.js (App Router, TS, Tailwind). SSR + ISR for SEO.

## Run locally
    # backend
    cd backend && pip install -e .[dev] && python -m app.main      # :8000, docs at /docs
    # frontend (new shell)
    cd frontend && npm install && npm run dev                      # :3000 (needs backend up)

## Test
    cd backend && python -m pytest -q          # 51 tests
    cd frontend && npm run test -- --run       # 19 tests

## Cost
Runs at **$0** on free tiers (Vercel + Render) with free public APIs. See DEPLOY.md.
```

- [ ] **Step 2: Create root `DEPLOY.md`** — the exact Phase B runbook (see Phase B below for the canonical steps; this file mirrors them so it lives in the repo).

```markdown
# Deploying VOUCH ($0)

Prereqves (all free): GitHub account + `gh` CLI authenticated, a Vercel account,
a Render account. Optional: a free GitHub PAT and a free Groq API key.

## 1. Private repo
    cd D:\vouch
    gh repo create vouch --private --source=. --remote=origin --push

## 2. Backend on Render
1. Render → New → **Blueprint** → connect the repo → it reads `render.yaml`.
   (Or New → Web Service → Root Dir `backend`, Build `pip install -e .`,
    Start `python -m app.main`, Health check `/api/health`, Plan: Free.)
2. Set env vars: `VOUCH_GITHUB_TOKEN` (free PAT, recommended), `VOUCH_LLM_API_KEY`
   (optional Groq). Leave `VOUCH_CORS_ORIGINS` for step 4.
3. Deploy; note the URL, e.g. `https://vouch-api.onrender.com`. Verify `/api/health`.

## 3. Frontend on Vercel
1. Vercel → Add New → Project → import the repo.
2. **Root Directory = `frontend`**.
3. Env (Production): `NEXT_PUBLIC_API_BASE` = the Render URL;
   `NEXT_PUBLIC_SITE_URL` = the Vercel URL (set after first deploy, then redeploy).
4. Deploy; note the URL, e.g. `https://vouch.vercel.app`.

## 4. Wire CORS
In Render, set `VOUCH_CORS_ORIGINS` = the Vercel URL; redeploy the backend.

## 5. Smoke test (live)
- `https://<vercel>/` → search "markdown editor" → cards render.
- `https://<vercel>/vs/tauri-vs-electron` → comparison renders (first hit slow if backend cold).
- `https://<render>/api/health` → ok.

## Notes
- Render free spins down when idle (~30-60s cold start). Optional: a free
  cron pinger (e.g. cron-job.org) hitting `/api/health` every 10 min keeps it warm.
- Everything here is free; no step requires a credit card.
```

- [ ] **Step 3: Commit**

```bash
git add README.md DEPLOY.md
git commit -m "docs: product README + $0 deploy runbook"
```

- [ ] **Step 4: Phase A done-gate** — full backend suite (51) + frontend build green; working tree clean. Controller confirms.

---

## Phase B — Deploy execution (HUMAN-IN-THE-LOOP — needs owner's accounts; not run headless)

These steps require the owner's GitHub/Vercel/Render accounts and browser OAuth. The agent may **assist** (run `gh` if authenticated, prepare env values) but must **confirm before each outward-facing action** and must not create accounts or push on the owner's behalf without explicit go-ahead.

- [ ] **B1. Create the private repo** — `gh repo create vouch --private --source=. --remote=origin --push` (requires `gh auth login` done). Confirm repo is **Private** in GitHub UI.
- [ ] **B2. Deploy backend (Render)** — connect repo, Blueprint from `render.yaml` (or manual web service), Free plan. Set `VOUCH_GITHUB_TOKEN` (free PAT) + optional `VOUCH_LLM_API_KEY`. Capture the backend URL; verify `/api/health`.
- [ ] **B3. Deploy frontend (Vercel)** — import repo, Root Dir `frontend`, set `NEXT_PUBLIC_API_BASE` (Render URL) + `NEXT_PUBLIC_SITE_URL` (Vercel URL). Deploy; capture the URL.
- [ ] **B4. Wire CORS** — set Render `VOUCH_CORS_ORIGINS` to the Vercel URL; redeploy backend.
- [ ] **B5. Live smoke test** — search, a `/vs/*` page, `/api/health`. Fix env/URL mismatches.
- [ ] **B6. (Optional) keep-warm** — free cron pinger on `/api/health` every 10 min.
- [ ] **B7. (Optional) privacy** — repo stays private; if the owner wants it public for sharing, flip in GitHub settings (still $0).

---

## Done criteria

**Phase A (this plan delivers, on approval):**
- `backend/Dockerfile`, `render.yaml`, prod env examples, root `README.md` + `DEPLOY.md` committed.
- `run()` honors `$PORT`/`HOST`; backend serves on an arbitrary port (container or process) — verified locally.
- 51 backend tests + frontend build green; **nothing deployed**, no external account touched.

**Phase B (owner-driven, later):**
- Private repo pushed; backend live on Render; frontend live on Vercel; CORS wired; live smoke test passes; $0.

**This is the final plan.** After Phase B, VOUCH v1 is live and demo-ready.
