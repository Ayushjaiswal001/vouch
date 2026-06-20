# VOUCH — Design Spec

**Date:** 2026-06-20
**Status:** Draft (awaiting review)
**Owner:** ayushjaiswal1204@gmail.com
**Supersedes / builds on:** `find-oss` (D:\find-oss) — its `find_oss` Python pipeline is reused as the backend brain.

---

## 1. Product

**Name:** VOUCH — **V**etted **O**pen-source **U**tilities & **C**omparison **H**ub.

**One-liner:** Product Hunt meets a trust scanner for open source — discover, compare, and trust-check any open-source tool in seconds, with AI-ranked recommendations and a transparent safety/health score.

**Audience:** developers and small eng teams choosing what OSS to adopt, who today rely on raw GitHub stars and guesswork.

**Why it's a business (not a side project):** OSS sprawl + supply-chain risk make "is this tool safe, maintained, and the right pick?" a recurring question. Free discovery + SEO comparison pages drive top-of-funnel; paid team features (continuous alerts, private audits, saved stacks) are the later monetization path. Out of scope for v1 but the narrative the architecture must not block.

### Goals (v1 = pitch-ready product)
- A polished, deployed web product that demos in under 60 seconds.
- Three reinforcing pillars: **deep trust scorecards**, **AI compare & recommend**, **SEO comparison pages**.
- Clean frontend/backend separation in different folders.
- Effectively **$0 / month** to run (free hosting tiers + free-tier LLM).

### Non-goals (v1)
- User accounts, auth, saved stacks/history — deferred to post-v1 (architecture leaves room).
- Community reviews/votes — deferred (cold-start risk).
- Paid billing, private repo scanning, CI integration — later.
- Mobile native app.

---

## 2. Architecture

Monorepo, two independently deployable apps.

```
vouch/
  backend/                 # FastAPI service (Python 3.11+)
    app/
      main.py              # FastAPI app factory + router mount
      api/                 # route modules
        search.py          # GET /api/search
        repo.py            # GET /api/repo/{owner}/{name}
        compare.py         # POST /api/compare
        recommend.py       # POST /api/recommend  (AI)
        comparisons.py     # GET /api/comparisons (SEO page data)
        health.py          # GET /api/health
      core/
        config.py          # env/settings (pydantic-settings)
        cache.py           # SQLite TTL cache (ported from find_oss/cache.py)
        ratelimit.py       # GitHub budget handling
      services/            # the migrated find_oss pipeline
        search.py          # GitHub REST wrapper
        filters.py         # hard-drop filters
        safety.py          # OSSF Scorecard + advisories
        pc_fit.py          # lightweight/native scoring
        score.py           # weighted total
        pipeline.py        # orchestrates search→filter→enrich→score
      ai/
        provider.py        # free-tier LLM client + graceful fallback
        compare.py         # builds prompt from structured scores, parses reply
      models/
        schemas.py         # pydantic request/response models
    tests/                 # ported pytest suite + new route tests
    pyproject.toml
  frontend/                # Next.js 14+ (App Router, TypeScript, Tailwind)
    app/
      page.tsx             # landing + search
      search/page.tsx      # results grid
      repo/[owner]/[name]/page.tsx   # repo detail + scorecard
      compare/page.tsx     # interactive compare
      vs/[slug]/page.tsx   # SEO comparison pages (SSR/ISR)
      sitemap.ts, robots.ts
    components/            # ScoreCard, RepoCard, CompareTable, SearchBar, AIPanel
    lib/api.ts             # typed client for the FastAPI backend
  docs/specs/
  docker-compose.yml       # run both locally with one command
  README.md
```

**The CLI is preserved as a bonus:** the migrated `services/` package keeps the `find_oss` import surface so the existing `find-oss` CLI entry can still run against the same code.

### Data flow
1. Frontend calls FastAPI over JSON (`lib/api.ts`).
2. FastAPI `services/pipeline.py` queries GitHub REST + OSSF Scorecard + advisories, caching in SQLite.
3. Pipeline returns structured, scored candidates.
4. AI routes (`/recommend`, `/compare`) pass the structured scores to the LLM for ranking/prose; **if the LLM is unavailable, they fall back to deterministic score-ranking** so the product never hard-fails.
5. SEO `/vs/[slug]` pages are server-rendered from the same `/api/comparisons` data with ISR caching.

### Why this stack
- **FastAPI + Python backend:** reuses the entire `find_oss` scoring pipeline (the data moat) instead of rewriting it; async-friendly for parallel enrichment; auto OpenAPI docs.
- **Next.js frontend:** SSR/ISR + metadata/sitemap are essential for the SEO-comparison-page growth engine; great DX with TS + Tailwind.
- **JSON REST boundary:** clean, testable seam between the two folders.

---

## 3. The three pillars

### 3.1 Trust / health scorecards
Expand current scoring into a visible, explainable card per repo. Factors, each shown with a value, a 0–1 sub-score, and a one-line *why*:
- **Safety** — OSSF Scorecard overall, open advisories (hard-drop on open CRITICAL).
- **Maintenance** — recency of last commit, release cadence.
- **Popularity** — stars (log-scaled), with raw count shown.
- **License** — SPDX id + permissive/copyleft flag.
- **Supply-chain signals** — signed releases, code-review, dangerous-workflow checks from Scorecard.
- **PC-fit / weight** — native vs Electron, install size (kept from current tool, reframed as "lightweight").

Weighted total reuses/extends the existing formula:
`score = 0.40*safety + 0.30*popularity + 0.15*maintenance + 0.15*pc_fit` (tunable; surfaced transparently).

### 3.2 AI compare & recommend
- **Input:** natural-language query (e.g. "best self-hosted analytics that isn't bloated").
- **Backend:** pipeline finds + scores candidates → `ai/compare.py` builds a compact prompt from the *structured* scores (not raw web text) → LLM returns a ranked shortlist, per-option tradeoffs, and a recommendation rationale.
- **Provider:** free-tier LLM (e.g. Groq or Google Gemini free tier, key via env; provider abstracted in `ai/provider.py`).
- **Fallback:** if no key / quota exceeded / timeout → deterministic top-N by score with templated reasoning. The UI labels which mode produced the answer.

### 3.3 SEO comparison pages
- `/vs/[slug]` e.g. `/vs/tauri-vs-electron`, server-rendered with full metadata, OG image, and structured data.
- Generated from the same scored data; ISR so they stay fresh without rebuilds.
- `sitemap.ts` enumerates a curated seed list of high-traffic comparisons; expandable over time.
- Purpose: rank on Google for "X vs Y" dev queries and funnel traffic into the app.

---

## 4. v1 phasing (all inside "pitch-ready")

- **P1 — Foundation:** scaffold monorepo; migrate `find_oss` into `backend/app/services`; stand up FastAPI with `/search` + `/repo` at parity with today; port pytest suite; run locally via docker-compose.
- **P2 — Frontend core:** Next.js landing + search + results grid + repo detail with scorecards + interactive compare view; typed API client.
- **P3 — AI layer:** `/recommend` + `/compare` endpoints with provider + fallback; AI panel in UI.
- **P4 — SEO + growth:** `/vs/[slug]` pages, sitemap, robots, metadata, OG images.
- **P5 — Polish + deploy:** pitch landing copy, analytics (privacy-friendly, free), deploy frontend (Vercel) + backend (Render/Fly free tier); smoke-test live.

---

## 5. Testing & quality

- **Backend:** port the 26 existing pytest tests to the new module path; add FastAPI route tests (TestClient) for each endpoint incl. AI fallback path; keep the opt-in integration test gated by `RUN_INTEGRATION=1`.
- **Frontend:** component/render smoke tests for the key pages and the API client; lint + typecheck.
- **Each layer independently testable** behind the JSON contract.

---

## 6. Cost & ops

- GitHub REST + OSSF Scorecard: free public APIs (PAT optional, raises rate limit).
- LLM: free-tier provider; fallback keeps product alive at zero quota.
- Hosting: Vercel (frontend) + Render/Fly free tier (backend) + SQLite (or free Postgres tier if persistence needed later).
- Target: **$0/month** to operate v1.

---

## 7. Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| GitHub rate limits throttle live demos | Aggressive SQLite caching; PAT in env; pre-warm cache for demo queries. |
| Free LLM quota/latency | Deterministic score-based fallback; cache AI results per query. |
| Backend cold-start on free tier slows first request | Lightweight health ping / keep-warm; SSR shows skeleton. |
| SEO pages thin/low-quality → no ranking | Curated seed list, rich structured data, real score tables (not boilerplate). |
| Scope creep into accounts/community | Explicitly deferred; architecture leaves seams, v1 ships without them. |

---

## 8. Operating constraints (hard rules)

These govern every later decision and override convenience.

1. **$0 to build and run.** Every tool, library, API, and host must have a genuinely free tier sufficient for v1. If any step *would* require payment, it is **stopped and surfaced separately** — never assumed — with at least one free alternative presented alongside, and the user decides. No silent paid dependencies.
2. **Model tiering for the work.** Research, architecture, planning, and non-trivial reasoning are done by the **higher model** (Opus). Mechanical/repetitive implementation (scaffolding, boilerplate, porting files, wiring) is delegated to **lower models** (Sonnet/Haiku subagents) to conserve tokens. The higher model reviews delegated output.
3. **Private repository.** The GitHub repo is created **private** (`gh repo create --private`). If `gh` is not authenticated, this is flagged and the user makes it private manually. Code is not pushed to a public remote at any point.

### Free-stack confirmation (v1)
| Need | Free choice | Paid only if… (alternative) |
|------|-------------|------------------------------|
| Source host | GitHub private repo (free) | — |
| Frontend host | Vercel Hobby (free) | high traffic → Cloudflare Pages (free) |
| Backend host | Render / Fly.io free tier | sleeps on idle → keep-warm ping (free) |
| Data APIs | GitHub REST + OSSF Scorecard (free) | rate limits → free PAT |
| LLM | Groq / Gemini free tier | quota hit → deterministic fallback (no cost) |
| DB | SQLite (free, file-based) | need hosted → Neon/Supabase free tier |
| Analytics | Plausible self-host or Umami (free) | — |

If any of these free tiers proves insufficient during the build, work pauses and the cost + free alternatives are surfaced before proceeding.

## 9. Open questions

None blocking. To revisit post-v1: monetization surface (alerts vs audits vs saved stacks), whether to add Postgres, auth provider choice.
