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
