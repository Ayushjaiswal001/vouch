"""OSSF Scorecard + GitHub Security Advisories enrichment."""

from __future__ import annotations

import time
from typing import Any

import requests

from . import cache
from .search import NetworkError, fetch_advisories

SCORECARD_API = "https://api.securityscorecards.dev/projects/github.com"

KEY_CHECKS = {
    "Maintained",
    "Code-Review",
    "Dangerous-Workflow",
    "Signed-Releases",
    "Vulnerabilities",
}


def fetch_scorecard(full_name: str, *, refresh: bool = False) -> dict[str, Any] | None:
    """Return Scorecard summary or None if not indexed."""
    if not refresh:
        cached = cache.get("scorecard", full_name)
        if cached is not None:
            return cached if cached != {"__missing__": True} else None
    url = f"{SCORECARD_API}/{full_name}"
    last_err: Exception | None = None
    for attempt in range(3):
        try:
            r = requests.get(url, timeout=20, headers={"User-Agent": "find-oss/0.1"})
        except requests.RequestException as e:
            last_err = e
            time.sleep(2**attempt)
            continue
        if r.status_code == 404:
            cache.put("scorecard", full_name, {"__missing__": True})
            return None
        if r.status_code >= 500:
            last_err = NetworkError(f"{r.status_code}")
            time.sleep(2**attempt)
            continue
        if not r.ok:
            return None
        data = r.json()
        summary = _summarize(data)
        cache.put("scorecard", full_name, summary)
        return summary
    return None


def _summarize(data: dict[str, Any]) -> dict[str, Any]:
    checks = {c["name"]: c.get("score", -1) for c in data.get("checks", [])}
    return {
        "score": data.get("score", 0.0),
        "checks": {name: checks.get(name, -1) for name in KEY_CHECKS},
        "date": data.get("date", ""),
    }


def has_open_critical(advisories: list[dict[str, Any]]) -> bool:
    return any(
        a.get("severity") == "critical" and a.get("state") in ("published", None)
        for a in advisories
    )


def has_open_high(advisories: list[dict[str, Any]]) -> bool:
    return any(
        a.get("severity") == "high" and a.get("state") in ("published", None)
        for a in advisories
    )


def assess(
    repo: dict[str, Any], *, token: str | None, refresh: bool = False
) -> dict[str, Any]:
    """Return enrichment dict for one repo."""
    full_name = repo["full_name"]
    scorecard = fetch_scorecard(full_name, refresh=refresh)
    advisories = fetch_advisories(full_name, token=token, refresh=refresh)
    return {
        "scorecard": scorecard,
        "advisories": advisories,
        "has_critical": has_open_critical(advisories),
        "has_high": has_open_high(advisories),
    }
