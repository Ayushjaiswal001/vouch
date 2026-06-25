<p align="center">
  <img src="frontend/public/logo.png" width="120" height="120" alt="VOUCH Logo" />
</p>

# VOUCH — Vetted Open-source Utilities & Comparison Hub

> Product Hunt meets a trust scanner for open source: discover, compare, and
> trust-check any open-source tool in seconds.

**Live:** https://vouch-mauve-two.vercel.app (frontend; backend deploy pending)

## What it does

Choosing open-source tools means guessing from GitHub stars. VOUCH scores every
candidate on:
- **Safety** — OSSF Scorecard, open advisories, license.
- **Maintenance** — commit recency, release cadence.
- **Popularity** — stars (log-scaled).
- **Lightweight** — native vs Electron, install size.

It explains the score, runs an AI comparison on top, serves SEO-optimised
`/vs/tauri-vs-electron`-style pages with full structured data, and greets users with a
**premium animated opening transition** (using session state to prevent repeat fatigue).

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
