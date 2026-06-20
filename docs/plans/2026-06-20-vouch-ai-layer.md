# VOUCH AI Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add natural-language **AI compare & recommend** to VOUCH — a `POST /api/recommend` endpoint that runs the existing discovery pipeline, then uses a free-tier LLM to produce a ranked recommendation with per-pick tradeoffs; with a deterministic fallback when no LLM is available — plus an "Ask AI" UI on the landing page.

**Architecture:** The endpoint reuses `pipeline.run()` + `serialize_item()` to get scored candidates, then calls `app/ai/compare.recommend()`. That function asks an OpenAI-compatible LLM (`app/ai/provider.py`, default Groq free tier, configured by env) for a JSON recommendation built **only** from the structured scores; on any failure (no key, quota, timeout, bad JSON) it returns a deterministic score-based recommendation. The frontend adds a client `AIRecommend` component and a tab toggle on the landing page; it labels whether the answer came from the LLM or the heuristic fallback.

**Tech Stack:** Backend — FastAPI, `requests` (no new deps), pydantic. Frontend — Next.js 16, React 19, Tailwind v4, Vitest. LLM — any OpenAI-compatible chat-completions endpoint; default Groq (`https://api.groq.com/openai/v1`, model `llama-3.3-70b-versatile`). **Cost: $0** — Groq's free tier needs no credit card; with no key the fallback keeps everything working.

**Reused backend surfaces (already built):**
- `pipeline.run(query, *, limit, relaxed, refresh, token)` → `{ok, top:[scored items], dropped, considered, error_kind?}`
- `serialize_item(item)` → JSON dict with `full_name, description, stars, license, language, scores{total,safety,popularity,maintenance,pc_fit}, ...`
- `search.get_token()`, `search.RateLimitError`, `search.NetworkError`
- `app/core/config.py` `Settings` (env prefix `VOUCH_`)

---

## File Structure

```
vouch/
  backend/
    app/
      core/config.py        # + llm_* settings (MODIFY)
      ai/
        __init__.py         # NEW (empty)
        provider.py         # NEW — OpenAI-compatible LLM call + LLMUnavailable
        compare.py          # NEW — prompt build, parse, deterministic fallback, recommend()
      models/schemas.py     # + Pick, RecommendResponse (MODIFY)
      api/recommend.py      # NEW — POST /api/recommend
      main.py               # mount recommend router (MODIFY)
    tests/
      test_ai_compare.py    # NEW — parse + fallback + recommend (provider mocked)
      test_api_recommend.py # NEW — route (pipeline + provider mocked)
  frontend/
    lib/api.ts              # + Pick, RecommendResponse, fetchRecommend (MODIFY)
    lib/__tests__/api.test.ts            # + fetchRecommend test (MODIFY)
    components/
      AIRecommend.tsx       # NEW — client: ask-AI form + render picks (pros/cons inline)
      __tests__/AIRecommend.test.tsx     # NEW
    app/
      search/HomeTabs.tsx   # NEW — client tab switch (Search | Ask AI)
      page.tsx              # render <HomeTabs/> (MODIFY)
```

**Responsibilities:**
- `ai/provider.py` — the only module that talks to the LLM HTTP API. Raises `LLMUnavailable` on every failure mode; no business logic.
- `ai/compare.py` — pure-ish orchestration: build prompt from structured candidates, parse/validate LLM JSON, deterministic fallback, choose mode. No HTTP except via `provider`.
- `api/recommend.py` — HTTP edge: validate body, run pipeline, call compare, shape response.
- `AIRecommend.tsx` — client UI; talks to backend only through `fetchRecommend`.

---

## Task 1: LLM provider + config

**Files:**
- Modify: `backend/app/core/config.py`
- Create: `backend/app/ai/__init__.py` (empty)
- Create: `backend/app/ai/provider.py`
- Test: covered indirectly in Task 2 (provider is mocked there); this task adds a tiny direct test `backend/tests/test_ai_provider.py`

- [ ] **Step 1: Add LLM settings to `backend/app/core/config.py`**

Insert these fields into the `Settings` class (after `github_token`):
```python
    # LLM (OpenAI-compatible). Empty key => deterministic fallback is used.
    llm_api_key: str | None = None
    llm_base_url: str = "https://api.groq.com/openai/v1"
    llm_model: str = "llama-3.3-70b-versatile"
```

- [ ] **Step 2: Create `backend/app/ai/__init__.py`** (empty file)

- [ ] **Step 3: Write the failing test `backend/tests/test_ai_provider.py`**

```python
import pytest
from app.ai import provider


def test_not_configured_raises(monkeypatch):
    monkeypatch.setattr(provider.settings, "llm_api_key", None, raising=False)
    assert provider.is_configured() is False
    with pytest.raises(provider.LLMUnavailable):
        provider.complete("sys", "user")


def test_http_error_wrapped(monkeypatch):
    monkeypatch.setattr(provider.settings, "llm_api_key", "k", raising=False)

    class FakeResp:
        ok = False
        status_code = 500
        text = "boom"

    monkeypatch.setattr(provider.requests, "post", lambda *a, **k: FakeResp())
    with pytest.raises(provider.LLMUnavailable):
        provider.complete("sys", "user")


def test_happy_path_returns_content(monkeypatch):
    monkeypatch.setattr(provider.settings, "llm_api_key", "k", raising=False)

    class FakeResp:
        ok = True
        status_code = 200

        def json(self):
            return {"choices": [{"message": {"content": "{\"summary\":\"x\",\"picks\":[]}"}}]}

    monkeypatch.setattr(provider.requests, "post", lambda *a, **k: FakeResp())
    out = provider.complete("sys", "user")
    assert "summary" in out
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `cd backend && python -m pytest tests/test_ai_provider.py -v`
Expected: FAIL (module `app.ai.provider` not found).

- [ ] **Step 5: Create `backend/app/ai/provider.py`**

```python
"""OpenAI-compatible LLM client. Free-tier friendly; fails loud via LLMUnavailable."""

from __future__ import annotations

from typing import Any

import requests

from app.core.config import settings


class LLMUnavailable(RuntimeError):
    """Raised for any reason the LLM cannot return a usable answer."""


def is_configured() -> bool:
    return bool(settings.llm_api_key)


def complete(system: str, user: str, *, timeout: float = 20.0) -> str:
    """Call chat completions and return the message content.

    Raises LLMUnavailable on missing key, network error, non-2xx, or bad shape.
    """
    if not settings.llm_api_key:
        raise LLMUnavailable("no LLM API key configured")

    try:
        resp = requests.post(
            f"{settings.llm_base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.llm_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.llm_model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "temperature": 0.2,
                "response_format": {"type": "json_object"},
            },
            timeout=timeout,
        )
    except requests.RequestException as e:
        raise LLMUnavailable(f"network error: {e}") from e

    if not resp.ok:
        raise LLMUnavailable(f"LLM HTTP {resp.status_code}: {resp.text[:200]}")

    try:
        data: Any = resp.json()
        return data["choices"][0]["message"]["content"]
    except (ValueError, KeyError, IndexError, TypeError) as e:
        raise LLMUnavailable(f"unexpected LLM response: {e}") from e
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd backend && python -m pytest tests/test_ai_provider.py -v`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add backend/app/core/config.py backend/app/ai/__init__.py backend/app/ai/provider.py backend/tests/test_ai_provider.py
git commit -m "feat(backend): OpenAI-compatible LLM provider + config"
```

---

## Task 2: Recommend logic (prompt, parse, fallback)

**Files:**
- Create: `backend/app/ai/compare.py`
- Test: `backend/tests/test_ai_compare.py`

- [ ] **Step 1: Write the failing test `backend/tests/test_ai_compare.py`**

```python
from app.ai import compare


def _cands():
    return [
        {
            "full_name": "a/one",
            "description": "first",
            "stars": 9000,
            "license": "MIT",
            "language": "Rust",
            "scores": {"total": 0.8, "safety": 0.8, "popularity": 0.8, "maintenance": 0.9, "pc_fit": 0.8},
        },
        {
            "full_name": "b/two",
            "description": "second",
            "stars": 1200,
            "license": "GPL-3.0",
            "language": "C++",
            "scores": {"total": 0.6, "safety": 0.4, "popularity": 0.6, "maintenance": 0.4, "pc_fit": 0.7},
        },
    ]


def test_parse_good_json_filters_unknown_names():
    content = (
        '{"summary":"pick one","picks":['
        '{"full_name":"a/one","recommendation":"best","pros":["fast"],"cons":["young"]},'
        '{"full_name":"ghost/x","recommendation":"nope","pros":[],"cons":[]}]}'
    )
    out = compare.parse(content, {"a/one", "b/two"})
    assert out is not None
    assert [p["full_name"] for p in out["picks"]] == ["a/one"]


def test_parse_rejects_bad_json():
    assert compare.parse("not json", {"a/one"}) is None
    assert compare.parse('{"summary":"x"}', {"a/one"}) is None  # no picks


def test_parse_strips_code_fences():
    fenced = "```json\n{\"summary\":\"s\",\"picks\":[{\"full_name\":\"a/one\",\"recommendation\":\"r\",\"pros\":[],\"cons\":[]}]}\n```"
    out = compare.parse(fenced, {"a/one"})
    assert out is not None and out["picks"][0]["full_name"] == "a/one"


def test_fallback_is_deterministic_and_uses_scores():
    out = compare.fallback("editors", _cands())
    assert out["picks"][0]["full_name"] == "a/one"
    assert "no LLM" in out["summary"]
    assert out["picks"][0]["pros"]  # non-empty


def test_recommend_uses_fallback_when_not_configured(monkeypatch):
    monkeypatch.setattr(compare.provider, "is_configured", lambda: False)
    mode, rec = compare.recommend("editors", _cands())
    assert mode == "fallback"
    assert rec["picks"][0]["full_name"] == "a/one"


def test_recommend_uses_ai_when_llm_returns_valid(monkeypatch):
    monkeypatch.setattr(compare.provider, "is_configured", lambda: True)
    monkeypatch.setattr(
        compare.provider,
        "complete",
        lambda system, user, **k: '{"summary":"ai says","picks":[{"full_name":"b/two","recommendation":"niche","pros":["light"],"cons":["small"]}]}',
    )
    mode, rec = compare.recommend("editors", _cands())
    assert mode == "ai"
    assert rec["summary"] == "ai says"
    assert rec["picks"][0]["full_name"] == "b/two"


def test_recommend_falls_back_when_llm_unavailable(monkeypatch):
    monkeypatch.setattr(compare.provider, "is_configured", lambda: True)

    def boom(*a, **k):
        raise compare.provider.LLMUnavailable("down")

    monkeypatch.setattr(compare.provider, "complete", boom)
    mode, rec = compare.recommend("editors", _cands())
    assert mode == "fallback"
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && python -m pytest tests/test_ai_compare.py -v`
Expected: FAIL (module `app.ai.compare` not found).

- [ ] **Step 3: Create `backend/app/ai/compare.py`**

```python
"""Build recommend prompts, parse/validate LLM JSON, deterministic fallback."""

from __future__ import annotations

import json
from typing import Any

from app.ai import provider

SYSTEM = (
    "You are an expert engineer who recommends open-source tools. "
    "You are given a user's need and candidate repositories, each with trust "
    "scores on a 0-1 scale (safety, popularity, maintenance, pc_fit where "
    "pc_fit means lightweight/native). Recommend the best pick(s) and give "
    "concise, honest tradeoffs. Respond ONLY with a JSON object of shape: "
    '{"summary": string, "picks": [{"full_name": string, "recommendation": '
    'string, "pros": [string], "cons": [string]}]}. Use ONLY the provided '
    "candidates; never invent repositories. Order picks best-first."
)


def _candidate_view(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "full_name": it["full_name"],
            "description": it.get("description", ""),
            "stars": it.get("stars", 0),
            "license": it.get("license", "?"),
            "language": it.get("language", ""),
            "scores": it["scores"],
        }
        for it in items
    ]


def build_user_prompt(query: str, candidates: list[dict[str, Any]]) -> str:
    return (
        f"User need: {query}\n\n"
        f"Candidates (JSON):\n{json.dumps(_candidate_view(candidates), indent=2)}\n\n"
        "Return the JSON recommendation now."
    )


def parse(content: str, valid_names: set[str]) -> dict[str, Any] | None:
    """Validate LLM output. Returns normalized dict or None if unusable."""
    text = content.strip()
    if text.startswith("```"):
        text = text.strip("`")
        stripped = text.lstrip()
        if stripped[:4].lower() == "json":
            text = stripped[4:]
    try:
        data = json.loads(text)
    except (json.JSONDecodeError, ValueError):
        return None
    if not isinstance(data, dict) or "picks" not in data or "summary" not in data:
        return None

    picks: list[dict[str, Any]] = []
    for p in data.get("picks", []):
        if not isinstance(p, dict):
            continue
        name = p.get("full_name")
        if name not in valid_names:
            continue
        picks.append(
            {
                "full_name": name,
                "recommendation": str(p.get("recommendation", "")),
                "pros": [str(x) for x in (p.get("pros") or [])][:5],
                "cons": [str(x) for x in (p.get("cons") or [])][:5],
            }
        )
    if not picks:
        return None
    return {"summary": str(data.get("summary", "")), "picks": picks}


def fallback(query: str, candidates: list[dict[str, Any]]) -> dict[str, Any]:
    """Deterministic, score-based recommendation (no LLM)."""
    picks: list[dict[str, Any]] = []
    for it in candidates[:3]:
        s = it["scores"]
        pros: list[str] = []
        cons: list[str] = []
        if s["safety"] >= 0.7:
            pros.append("strong safety/security signals")
        if s["popularity"] >= 0.7:
            pros.append("widely adopted")
        if s["maintenance"] >= 0.7:
            pros.append("actively maintained")
        if s["pc_fit"] >= 0.7:
            pros.append("lightweight footprint")
        if s["safety"] < 0.5:
            cons.append("limited safety signals")
        if s["maintenance"] < 0.5:
            cons.append("maintenance looks slow")
        if s["pc_fit"] < 0.5:
            cons.append("heavier footprint")
        picks.append(
            {
                "full_name": it["full_name"],
                "recommendation": f"Overall trust {round(s['total'] * 100)}/100.",
                "pros": pros or ["balanced overall profile"],
                "cons": cons or ["no notable weaknesses in our signals"],
            }
        )
    return {
        "summary": f"Ranked by overall trust score for “{query}” "
        "(offline ranking — no LLM key set).",
        "picks": picks,
    }


def recommend(
    query: str, candidates: list[dict[str, Any]]
) -> tuple[str, dict[str, Any]]:
    """Return (mode, recommendation). mode is 'ai' or 'fallback'."""
    if not candidates:
        return "fallback", {"summary": "No candidates found.", "picks": []}
    valid = {c["full_name"] for c in candidates}
    if provider.is_configured():
        try:
            content = provider.complete(SYSTEM, build_user_prompt(query, candidates))
            parsed = parse(content, valid)
            if parsed is not None:
                return "ai", parsed
        except provider.LLMUnavailable:
            pass
    return "fallback", fallback(query, candidates)
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd backend && python -m pytest tests/test_ai_compare.py -v`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/app/ai/compare.py backend/tests/test_ai_compare.py
git commit -m "feat(backend): AI recommend logic with deterministic fallback"
```

---

## Task 3: `POST /api/recommend` endpoint

**Files:**
- Modify: `backend/app/models/schemas.py` (add `Pick`, `RecommendResponse`)
- Create: `backend/app/api/recommend.py`
- Modify: `backend/app/main.py` (mount router)
- Test: `backend/tests/test_api_recommend.py`

- [ ] **Step 1: Add schemas to `backend/app/models/schemas.py`**

Append (after `SearchResponse`):
```python
class Pick(BaseModel):
    full_name: str
    recommendation: str = ""
    pros: list[str] = []
    cons: list[str] = []


class RecommendResponse(BaseModel):
    ok: bool
    mode: str  # "ai" | "fallback"
    query: str
    summary: str = ""
    picks: list[Pick] = []
    repos: list[RepoResult] = []
    auth: bool = False
```

- [ ] **Step 2: Write the failing test `backend/tests/test_api_recommend.py`**

```python
from fastapi.testclient import TestClient

from app.main import create_app


def _ok_result():
    return {
        "ok": True,
        "query": "editors",
        "considered": 2,
        "dropped": [],
        "top": [
            {
                "repo": {
                    "full_name": "a/one",
                    "html_url": "https://github.com/a/one",
                    "description": "first",
                    "stargazers_count": 9000,
                    "license": {"spdx_id": "MIT"},
                    "pushed_at": "2026-06-01T00:00:00Z",
                    "created_at": "2020-01-01T00:00:00Z",
                    "language": "Rust",
                    "topics": [],
                },
                "enrichment": {"scorecard": None, "advisories": [], "has_high": False, "has_critical": False},
                "pc_details": {"stack": "Rust", "win_install_bytes": None},
                "score_total": 0.8,
                "safety_score": 0.8,
                "pop_score": 0.8,
                "maint_score": 0.9,
                "pc_score": 0.8,
            }
        ],
    }


def test_recommend_empty_query_400():
    client = TestClient(create_app())
    resp = client.post("/api/recommend", json={"query": "  "})
    assert resp.status_code == 400


def test_recommend_fallback_path(mocker):
    mocker.patch("app.api.recommend.pipeline.run", return_value=_ok_result())
    mocker.patch("app.api.recommend.search.get_token", return_value=None)
    mocker.patch("app.api.recommend.compare.provider.is_configured", return_value=False)
    client = TestClient(create_app())
    resp = client.post("/api/recommend", json={"query": "editors", "limit": 5})
    assert resp.status_code == 200
    body = resp.json()
    assert body["mode"] == "fallback"
    assert body["query"] == "editors"
    assert body["repos"][0]["full_name"] == "a/one"
    assert body["picks"][0]["full_name"] == "a/one"


def test_recommend_ai_path(mocker):
    mocker.patch("app.api.recommend.pipeline.run", return_value=_ok_result())
    mocker.patch("app.api.recommend.search.get_token", return_value=None)
    mocker.patch("app.api.recommend.compare.provider.is_configured", return_value=True)
    mocker.patch(
        "app.api.recommend.compare.provider.complete",
        return_value='{"summary":"ai pick","picks":[{"full_name":"a/one","recommendation":"go","pros":["fast"],"cons":["new"]}]}',
    )
    client = TestClient(create_app())
    resp = client.post("/api/recommend", json={"query": "editors"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["mode"] == "ai"
    assert body["summary"] == "ai pick"
    assert body["picks"][0]["pros"] == ["fast"]
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd backend && python -m pytest tests/test_api_recommend.py -v`
Expected: FAIL (`app.api.recommend` not found).

- [ ] **Step 4: Create `backend/app/api/recommend.py`**

```python
"""AI compare & recommend route."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.ai import compare
from app.models.schemas import RecommendResponse
from app.serializers import serialize_item
from app.services import pipeline, search

router = APIRouter()


class RecommendRequest(BaseModel):
    query: str
    limit: int = 5


@router.post("/recommend", response_model=RecommendResponse)
def api_recommend(body: RecommendRequest) -> RecommendResponse:
    query = body.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query is empty.")
    limit = max(1, min(10, body.limit))

    token = search.get_token()
    result = pipeline.run(query, limit=limit, token=token)

    if not result.get("ok") and result.get("error_kind") == "rate_limit":
        raise HTTPException(status_code=429, detail=result.get("error"))
    if not result.get("ok") and result.get("error_kind") == "network":
        raise HTTPException(status_code=502, detail=result.get("error"))

    repos = [serialize_item(x) for x in result.get("top", [])]
    mode, rec = compare.recommend(query, repos)

    return RecommendResponse(
        ok=bool(result.get("ok")),
        mode=mode,
        query=query,
        summary=rec["summary"],
        picks=rec["picks"],
        repos=repos,
        auth=bool(token),
    )
```

- [ ] **Step 5: Mount the router — modify `backend/app/main.py`**

Change `from app.api import health, repo, search` to:
```python
from app.api import health, recommend, repo, search
```
And add after the repo router include:
```python
    app.include_router(recommend.router, prefix="/api")
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_api_recommend.py -v`
Expected: PASS (3 tests).

- [ ] **Step 7: Run the full backend suite**

Run: `cd backend && python -m pytest -q`
Expected: all pass (32 prior + 3 provider + 7 compare + 3 recommend = 45).

- [ ] **Step 8: Commit**

```bash
git add backend/app/models/schemas.py backend/app/api/recommend.py backend/app/main.py backend/tests/test_api_recommend.py
git commit -m "feat(backend): POST /api/recommend endpoint"
```

---

## Task 4: Frontend API client — `fetchRecommend`

**Files:**
- Modify: `frontend/lib/api.ts`
- Modify: `frontend/lib/__tests__/api.test.ts`

- [ ] **Step 1: Add types + client to `frontend/lib/api.ts`**

Append (after the `SearchResponse` interface, before `API_BASE` is fine — but keep `API_BASE` defined before the functions; place these interfaces near the other interfaces and the function at the end):
```typescript
export interface Pick {
  full_name: string;
  recommendation: string;
  pros: string[];
  cons: string[];
}

export interface RecommendResponse {
  ok: boolean;
  mode: "ai" | "fallback";
  query: string;
  summary: string;
  picks: Pick[];
  repos: RepoResult[];
  auth: boolean;
}
```
And append this function at the end of the file:
```typescript
export async function fetchRecommend(
  query: string,
  limit = 5,
): Promise<RecommendResponse> {
  const res = await fetch(`${API_BASE}/api/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, limit }),
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail?.detail ?? `Recommend failed (${res.status})`);
  }
  return (await res.json()) as RecommendResponse;
}
```

- [ ] **Step 2: Add a failing test to `frontend/lib/__tests__/api.test.ts`**

Append this describe block at the end of the file:
```typescript
import { fetchRecommend } from "@/lib/api";

describe("fetchRecommend", () => {
  it("POSTs the query and parses the body", async () => {
    const body = { ok: true, mode: "fallback", query: "x", summary: "s", picks: [], repos: [], auth: false };
    const f = mockFetch(200, body);
    vi.stubGlobal("fetch", f);
    const out = await fetchRecommend("sql client", 5);
    expect(out.mode).toBe("fallback");
    const [url, init] = f.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/recommend");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ query: "sql client", limit: 5 });
  });

  it("throws on non-ok", async () => {
    vi.stubGlobal("fetch", mockFetch(502, { detail: "bad gateway" }));
    await expect(fetchRecommend("x")).rejects.toThrow("bad gateway");
  });
});
```

- [ ] **Step 3: Run the gate**

Run: `cd frontend && npm run test -- --run lib/__tests__/api.test.ts`
Expected: PASS (existing api tests + 2 new fetchRecommend tests). Then `npm run typecheck` — no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/api.ts frontend/lib/__tests__/api.test.ts
git commit -m "feat(frontend): fetchRecommend client + types"
```

---

## Task 5: `AIRecommend` component + landing tabs

**Files:**
- Create: `frontend/components/AIRecommend.tsx`
- Create: `frontend/app/search/HomeTabs.tsx`
- Modify: `frontend/app/page.tsx`
- Test: `frontend/components/__tests__/AIRecommend.test.tsx`

- [ ] **Step 1: Create `frontend/components/AIRecommend.tsx`**

```tsx
"use client";

import { useState } from "react";
import { fetchRecommend, type RecommendResponse } from "@/lib/api";
import RepoCard from "@/components/RepoCard";

export default function AIRecommend() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<RecommendResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      setData(await fetchRecommend(q, 5));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Recommend failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={run} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Describe what you need: 'self-hosted analytics that isn't bloated'"
          aria-label="ask ai query"
          className="flex-1 rounded-md border border-gray-300 px-4 py-2.5 outline-none focus:border-gray-900"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-indigo-600 px-5 py-2.5 font-medium text-white disabled:opacity-50"
        >
          {loading ? "Thinking…" : "Ask AI"}
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {data && (
        <section className="mt-4 rounded-lg border border-indigo-200 bg-indigo-50/50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <span
              className={`rounded px-2 py-0.5 text-xs font-semibold ${
                data.mode === "ai" ? "bg-indigo-600 text-white" : "bg-gray-300 text-gray-700"
              }`}
            >
              {data.mode === "ai" ? "AI recommendation" : "Heuristic ranking"}
            </span>
            {data.mode === "fallback" && (
              <span className="text-xs text-gray-500">add a free LLM key for AI prose</span>
            )}
          </div>
          <p className="text-sm text-gray-800">{data.summary}</p>

          <ol className="mt-3 space-y-3">
            {data.picks.map((p, i) => (
              <li key={p.full_name} className="rounded-md border border-gray-200 bg-white p-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-gray-500">#{i + 1}</span>
                  <span className="font-semibold">{p.full_name}</span>
                </div>
                {p.recommendation && (
                  <p className="mt-1 text-sm text-gray-700">{p.recommendation}</p>
                )}
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <ul className="space-y-0.5 text-sm text-green-700">
                    {p.pros.map((x, j) => (
                      <li key={j}>+ {x}</li>
                    ))}
                  </ul>
                  <ul className="space-y-0.5 text-sm text-amber-700">
                    {p.cons.map((x, j) => (
                      <li key={j}>− {x}</li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {data?.repos.map((repo) => (
          <RepoCard key={repo.full_name} repo={repo} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `frontend/app/search/HomeTabs.tsx`**

```tsx
"use client";

import { useState } from "react";
import SearchClient from "@/app/search/SearchClient";
import AIRecommend from "@/components/AIRecommend";

export default function HomeTabs() {
  const [tab, setTab] = useState<"search" | "ai">("search");
  return (
    <div>
      <div className="mb-4 inline-flex rounded-lg border border-gray-200 bg-white p-1 text-sm">
        <button
          onClick={() => setTab("search")}
          className={`rounded-md px-4 py-1.5 font-medium ${
            tab === "search" ? "bg-gray-900 text-white" : "text-gray-600"
          }`}
        >
          Search
        </button>
        <button
          onClick={() => setTab("ai")}
          className={`rounded-md px-4 py-1.5 font-medium ${
            tab === "ai" ? "bg-indigo-600 text-white" : "text-gray-600"
          }`}
        >
          Ask AI
        </button>
      </div>
      {tab === "search" ? <SearchClient /> : <AIRecommend />}
    </div>
  );
}
```

- [ ] **Step 3: Update `frontend/app/page.tsx`** — replace the `<SearchClient />` usage with `<HomeTabs />`:

```tsx
import HomeTabs from "@/app/search/HomeTabs";

export default function Home() {
  return (
    <div className="space-y-6">
      <section className="text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Find open-source tools you can trust
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-gray-600">
          VOUCH ranks open-source projects by safety, maintenance, popularity, and
          how lightweight they are — search directly, or ask the AI to recommend and
          compare for your exact need.
        </p>
      </section>
      <HomeTabs />
    </div>
  );
}
```

- [ ] **Step 4: Write the test `frontend/components/__tests__/AIRecommend.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AIRecommend from "@/components/AIRecommend";
import * as api from "@/lib/api";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("AIRecommend", () => {
  it("submits a query and renders the recommendation", async () => {
    vi.spyOn(api, "fetchRecommend").mockResolvedValue({
      ok: true,
      mode: "fallback",
      query: "editors",
      summary: "ranked offline",
      picks: [{ full_name: "a/one", recommendation: "solid", pros: ["fast"], cons: ["new"] }],
      repos: [],
      auth: false,
    });
    const user = userEvent.setup();
    render(<AIRecommend />);
    await user.type(screen.getByLabelText("ask ai query"), "editors");
    await user.click(screen.getByRole("button", { name: /ask ai/i }));
    expect(await screen.findByText("ranked offline")).toBeInTheDocument();
    expect(screen.getByText("a/one")).toBeInTheDocument();
    expect(screen.getByText("Heuristic ranking")).toBeInTheDocument();
    expect(screen.getByText("+ fast")).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Gates + build**

Run from `D:\vouch\frontend`:
```powershell
npm run test -- --run
npm run typecheck
npm run build
```
Expected: all tests pass (incl. new AIRecommend), type-clean, build succeeds (route list unchanged: `/`, `/compare`, `/repo/[owner]/[name]`).

- [ ] **Step 6: Commit**

```bash
git add frontend/components/AIRecommend.tsx frontend/app/search/HomeTabs.tsx frontend/app/page.tsx frontend/components/__tests__/AIRecommend.test.tsx
git commit -m "feat(frontend): Ask-AI recommend UI with search/AI tabs"
```

---

## Task 6: Docs + env + final verification

**Files:**
- Modify: `backend/.env.example` (add LLM vars)
- Modify: `backend/README.md` (document /api/recommend + LLM env)
- Modify: `frontend/README.md` (mention Ask AI)

- [ ] **Step 1: Add LLM vars to `backend/.env.example`**

Append:
```
# Optional free-tier LLM for AI compare/recommend (OpenAI-compatible).
# Without a key, /api/recommend uses a deterministic score-based fallback.
# Groq free tier (no credit card): https://console.groq.com  ->  create API key
VOUCH_LLM_API_KEY=
VOUCH_LLM_BASE_URL=https://api.groq.com/openai/v1
VOUCH_LLM_MODEL=llama-3.3-70b-versatile
```

- [ ] **Step 2: Document the endpoint in `backend/README.md`**

Under the `## Endpoints` list, add:
```markdown
- `POST /api/recommend` — body `{ "query": "...", "limit": 5 }` → AI (or fallback) recommendation + scored repos
```
And add a short section:
```markdown
## AI recommend (free, optional)
`/api/recommend` uses an OpenAI-compatible LLM if `VOUCH_LLM_API_KEY` is set
(default provider: Groq free tier — no credit card). With no key it returns a
deterministic, score-based recommendation, so it always works at $0.
```

- [ ] **Step 3: Mention Ask AI in `frontend/README.md`**

Under `## Routes`, change the `/` line to:
```markdown
- `/`                      landing with two modes: live Search and Ask AI (recommend & compare)
```

- [ ] **Step 4: Full backend suite**

Run: `cd backend && python -m pytest -q`
Expected: 45 passed.

- [ ] **Step 5: Full frontend gates**

Run from `D:\vouch\frontend`:
```powershell
npm run test -- --run
npm run typecheck
npm run build
```
Expected: all green.

- [ ] **Step 6: Controller (Opus) live end-to-end verification**

With no LLM key set (default), start backend + frontend and POST a real recommend; confirm `mode: "fallback"`, a non-empty `summary`, and `picks` derived from real GitHub scores. (Run by the controller, not the subagent.)
```bash
curl -s -X POST http://127.0.0.1:8000/api/recommend -H "Content-Type: application/json" -d '{"query":"markdown editor","limit":3}'
```
Expected: JSON with `"mode":"fallback"`, real repo full_names in `picks` and `repos`.

- [ ] **Step 7: Commit**

```bash
git add backend/.env.example backend/README.md frontend/README.md
git commit -m "docs: document AI recommend endpoint + LLM env"
```

---

## Done criteria for Plan 3

- `cd backend && python -m pytest -q` → 45 passed.
- Frontend `npm run test -- --run`, `npm run typecheck`, `npm run build` all green.
- `POST /api/recommend` returns an AI recommendation when `VOUCH_LLM_API_KEY` is set, and a deterministic score-based recommendation otherwise — verified live in fallback mode (no key, $0).
- Landing page has Search / Ask AI tabs; Ask AI renders summary + ranked picks (pros/cons) + repo cards, labeled by mode.
- No paid dependency introduced; Groq key (if used) is a free, no-credit-card tier surfaced in `.env.example`.

**Next plan:** `Plan 4 — SEO comparison pages` (`/vs/[slug]` server-rendered pages + sitemap).
