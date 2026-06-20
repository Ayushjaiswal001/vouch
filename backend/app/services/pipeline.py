"""End-to-end discovery pipeline reusable by both CLI and web UI."""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from typing import Any, Callable

from . import filters, pc_fit, safety, score, search


def _enrich_one(
    repo: dict[str, Any], *, token: str | None, refresh: bool
) -> dict[str, Any]:
    enrichment = safety.assess(repo, token=token, refresh=refresh)
    assets = search.fetch_release_assets(
        repo["full_name"], token=token, refresh=refresh
    )
    pc_score, pc_details = pc_fit.score_pc_fit(repo, assets)
    safety_score, hard_drop = score.safety(enrichment)
    pop_score = score.popularity(repo)
    maint_score = score.maintenance(repo)
    return {
        "repo": repo,
        "enrichment": enrichment,
        "pc_details": pc_details,
        "pc_score": pc_score,
        "safety_score": safety_score,
        "pop_score": pop_score,
        "maint_score": maint_score,
        "hard_drop": hard_drop,
        "score_total": 0.0
        if hard_drop
        else score.total(
            safety_s=safety_score,
            pop_s=pop_score,
            maint_s=maint_score,
            pc_s=pc_score,
        ),
    }


def run(
    query: str,
    *,
    limit: int = 5,
    relaxed: bool = False,
    refresh: bool = False,
    token: str | None = None,
    on_progress: Callable[[str], None] | None = None,
) -> dict[str, Any]:
    """Run the full pipeline. Returns a result dict.

    Result keys:
      ok            bool - false if a hard error occurred
      error         str  - present when ok is false
      error_kind    str  - 'rate_limit' | 'network' | 'no_results' | ...
      query         str  - original query
      considered    int  - number of candidates from search
      dropped       list[tuple[repo, reason]]
      top           list[scored item]
    """
    notify = on_progress or (lambda _msg: None)

    notify("Searching GitHub...")
    try:
        candidates = search.search_repos(
            query, token=token, relaxed=relaxed, refresh=refresh
        )
    except search.RateLimitError as e:
        return {"ok": False, "error_kind": "rate_limit", "error": str(e)}
    except search.NetworkError as e:
        return {"ok": False, "error_kind": "network", "error": str(e)}

    considered = len(candidates)
    survivors: list[dict[str, Any]] = []
    dropped: list[tuple[dict[str, Any], str]] = []
    for repo in candidates:
        ok, reason = filters.passes_baseline(repo, relaxed=relaxed)
        if ok:
            survivors.append(repo)
        else:
            dropped.append((repo, reason))

    if not survivors:
        return {
            "ok": False,
            "error_kind": "no_results",
            "error": "No candidates passed the filters."
            + ("" if relaxed else " Try with relaxed=True."),
            "query": query,
            "considered": considered,
            "dropped": dropped,
            "top": [],
        }

    notify(f"Enriching {len(survivors)} candidates...")
    scored: list[dict[str, Any]] = []
    with ThreadPoolExecutor(max_workers=5) as pool:
        futures = [
            pool.submit(_enrich_one, r, token=token, refresh=refresh)
            for r in survivors
        ]
        for fut in futures:
            item = fut.result()
            if item["hard_drop"]:
                dropped.append((item["repo"], "open CRITICAL security advisory"))
            else:
                scored.append(item)

    top = score.rank(scored, limit=limit)
    return {
        "ok": True,
        "query": query,
        "considered": considered,
        "dropped": dropped,
        "top": top,
    }


def enrich_repo(
    full_name: str, *, token: str | None = None, refresh: bool = False
) -> dict[str, Any] | None:
    """Fetch + enrich + score a single repo. Returns a scored item or None."""
    repo = search.get_repo(full_name, token=token, refresh=refresh)
    if repo is None:
        return None
    # /repos objects usually include topics on modern API versions; default to [].
    repo.setdefault("topics", [])
    return _enrich_one(repo, token=token, refresh=refresh)
