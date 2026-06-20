"""Hard-drop filters applied to GitHub search results before enrichment."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from .search import ALLOWED_LICENSES


def _parse_dt(s: str) -> datetime:
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    return datetime.fromisoformat(s)


def is_archived(repo: dict[str, Any]) -> bool:
    return bool(repo.get("archived"))


def is_fork(repo: dict[str, Any]) -> bool:
    return bool(repo.get("fork"))


def has_acceptable_license(repo: dict[str, Any]) -> bool:
    lic = (repo.get("license") or {}).get("spdx_id", "")
    return lic.lower() in ALLOWED_LICENSES


def is_old_enough(repo: dict[str, Any], min_days: int = 365) -> bool:
    created = repo.get("created_at")
    if not created:
        return False
    return _parse_dt(created) <= datetime.now(timezone.utc) - timedelta(days=min_days)


def is_active(repo: dict[str, Any], max_days_idle: int = 365) -> bool:
    pushed = repo.get("pushed_at")
    if not pushed:
        return False
    return _parse_dt(pushed) >= datetime.now(timezone.utc) - timedelta(
        days=max_days_idle
    )


def passes_baseline(repo: dict[str, Any], *, relaxed: bool = False) -> tuple[bool, str]:
    """Return (passes, reason_if_dropped)."""
    if is_archived(repo):
        return False, "archived"
    if is_fork(repo):
        return False, "fork"
    if not has_acceptable_license(repo):
        return False, f"license not allowed ({(repo.get('license') or {}).get('spdx_id', 'none')})"
    if relaxed:
        return True, ""
    if not is_old_enough(repo):
        return False, "younger than 1 year"
    if not is_active(repo):
        return False, "no commits in last 12 months"
    if repo.get("stargazers_count", 0) < 500:
        return False, f"only {repo.get('stargazers_count', 0)} stars (<500)"
    return True, ""
