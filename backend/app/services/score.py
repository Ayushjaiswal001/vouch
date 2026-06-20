"""Weighted scoring + ranking."""

from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Any

from .filters import _parse_dt

WEIGHTS = {"safety": 0.40, "popularity": 0.30, "maintenance": 0.15, "pc_fit": 0.15}


def popularity(repo: dict[str, Any]) -> float:
    stars = max(1, repo.get("stargazers_count", 0))
    return min(1.0, math.log10(stars) / 5)


def maintenance(repo: dict[str, Any]) -> float:
    pushed = repo.get("pushed_at")
    if not pushed:
        return 0.0
    days = (datetime.now(timezone.utc) - _parse_dt(pushed)).days
    if days <= 90:
        return 1.0
    if days <= 180:
        return 0.7
    if days <= 365:
        return 0.4
    return 0.0


def safety(enrichment: dict[str, Any]) -> tuple[float, bool]:
    """Return (safety score 0..1, hard_drop flag)."""
    if enrichment.get("has_critical"):
        return 0.0, True

    sc = enrichment.get("scorecard")
    if sc is None:
        base = 0.5
    else:
        base = sc.get("score", 0.0) / 10.0

    if enrichment.get("has_high"):
        base -= 0.3

    return max(0.0, min(1.0, base)), False


def total(
    *, safety_s: float, pop_s: float, maint_s: float, pc_s: float
) -> float:
    return (
        WEIGHTS["safety"] * safety_s
        + WEIGHTS["popularity"] * pop_s
        + WEIGHTS["maintenance"] * maint_s
        + WEIGHTS["pc_fit"] * pc_s
    )


def rank(scored: list[dict[str, Any]], limit: int = 5) -> list[dict[str, Any]]:
    return sorted(scored, key=lambda r: r["score_total"], reverse=True)[:limit]
