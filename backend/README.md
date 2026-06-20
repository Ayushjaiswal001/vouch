# VOUCH backend

FastAPI service wrapping the find_oss discovery pipeline.

## Run
    pip install -e .[dev]
    python -m app.main        # http://127.0.0.1:8000  (docs at /docs)

## Endpoints
- `GET /api/health`
- `GET /api/search?q=<query>&limit=5&relaxed=false&refresh=false`
- `GET /api/repo/{owner}/{name}`
- `POST /api/recommend` — body `{ "query": "...", "limit": 5 }` → AI (or fallback) recommendation + scored repos

## Test
    python -m pytest -v

## Auth (free, optional)
Set `VOUCH_GITHUB_TOKEN` (or `GITHUB_TOKEN`) to a free read-only PAT to raise the
GitHub rate limit. Works without one (60 req/hr).

## AI recommend (free, optional)
`/api/recommend` uses an OpenAI-compatible LLM if `VOUCH_LLM_API_KEY` is set
(default provider: Groq free tier — no credit card). With no key it returns a
deterministic, score-based recommendation, so it always works at $0.
