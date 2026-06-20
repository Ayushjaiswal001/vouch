"""Pure transforms: internal scored dicts -> API JSON dicts."""

from __future__ import annotations

from typing import Any

from app.services import pc_fit


def serialize_item(item: dict[str, Any]) -> dict[str, Any]:
    r = item["repo"]
    sc = item["enrichment"].get("scorecard")
    advisories = item["enrichment"].get("advisories", [])
    return {
        "full_name": r["full_name"],
        "html_url": r["html_url"],
        "description": r.get("description") or "",
        "stars": r.get("stargazers_count", 0),
        "license": (r.get("license") or {}).get("spdx_id", "?"),
        "pushed_at": r.get("pushed_at"),
        "created_at": r.get("created_at"),
        "language": r.get("language") or "",
        "topics": r.get("topics") or [],
        "scorecard": None
        if sc is None
        else {"score": sc.get("score"), "checks": sc.get("checks", {})},
        "advisories_count": len(advisories),
        "has_high_advisory": item["enrichment"].get("has_high", False),
        "has_critical_advisory": item["enrichment"].get("has_critical", False),
        "pc_details": {
            "stack": item["pc_details"].get("stack"),
            "win_install_bytes": item["pc_details"].get("win_install_bytes"),
            "win_install_str": pc_fit.format_size(
                item["pc_details"].get("win_install_bytes")
            ),
        },
        "scores": {
            "total": round(item["score_total"], 3),
            "safety": round(item["safety_score"], 3),
            "popularity": round(item["pop_score"], 3),
            "maintenance": round(item["maint_score"], 3),
            "pc_fit": round(item["pc_score"], 3),
        },
    }


def serialize_dropped(
    dropped: list[tuple[dict[str, Any], str]]
) -> list[dict[str, Any]]:
    return [
        {
            "full_name": r.get("full_name", "?"),
            "html_url": r.get("html_url", ""),
            "reason": reason,
        }
        for r, reason in dropped
    ]
