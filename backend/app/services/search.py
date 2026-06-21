"""GitHub Search API + per-repo metadata fetch."""

from __future__ import annotations

import os
import time
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import quote

import requests

from . import cache

GH_API = "https://api.github.com"

ALLOWED_LICENSES = [
    "mit",
    "apache-2.0",
    "bsd-3-clause",
    "bsd-2-clause",
    "gpl-3.0",
    "gpl-2.0",
    "lgpl-3.0",
    "mpl-2.0",
]


class RateLimitError(RuntimeError):
    pass


class NetworkError(RuntimeError):
    pass


def _headers(token: str | None) -> dict[str, str]:
    h = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "find-oss/0.1",
    }
    if token:
        h["Authorization"] = f"Bearer {token}"
    return h


def _request(
    url: str, token: str | None, *, params: dict[str, Any] | None = None
) -> Any:
    last_err: Exception | None = None
    for attempt in range(3):
        try:
            r = requests.get(url, headers=_headers(token), params=params, timeout=20)
        except requests.RequestException as e:
            last_err = e
            time.sleep(2**attempt)
            continue
        if r.status_code == 403 and (
            "rate limit" in r.text.lower()
            or "abuse" in r.text.lower()
            or r.headers.get("X-RateLimit-Remaining") == "0"
        ):
            raise RateLimitError(
                "GitHub API rate limit hit. Set GITHUB_TOKEN (free PAT) "
                "or wait an hour. See README for instructions."
            )
        if r.status_code == 404:
            return None
        if r.status_code >= 500:
            last_err = NetworkError(f"{r.status_code} from {url}")
            time.sleep(2**attempt)
            continue
        if not r.ok:
            raise NetworkError(f"GitHub API {r.status_code}: {r.text[:200]}")
        return r.json()
    raise NetworkError(f"failed after 3 retries: {last_err}")


def search_repos(
    query: str,
    *,
    token: str | None = None,
    per_page: int | None = None,
    relaxed: bool = False,
    refresh: bool = False,
) -> list[dict[str, Any]]:
    """Run GitHub repo search filtered by license/age/stars."""
    if per_page is None:
        per_page = 20 if token else 8

    parts = [query]
    if not relaxed:
        a_year_ago = (datetime.now(timezone.utc) - timedelta(days=365)).strftime(
            "%Y-%m-%d"
        )
        parts.append("stars:>500")
        parts.append(f"pushed:>{a_year_ago}")
        parts.append("license:" + ",".join(ALLOWED_LICENSES))
        parts.append("archived:false")
        parts.append("is:public")

    q = " ".join(parts)
    cache_key = f"{q}|pp={per_page}"
    if not refresh:
        cached = cache.get("search", cache_key)
        if cached is not None:
            return cached

    data = _request(
        f"{GH_API}/search/repositories",
        token,
        params={"q": q, "sort": "stars", "order": "desc", "per_page": per_page},
    )
    items = data.get("items", []) if data else []
    cache.put("search", cache_key, items)
    return items


def fetch_release_assets(
    full_name: str, *, token: str | None, refresh: bool = False
) -> list[dict[str, Any]]:
    """Return latest release assets, or [] if no release."""
    if not refresh:
        cached = cache.get("release", full_name)
        if cached is not None:
            return cached
    data = _request(f"{GH_API}/repos/{full_name}/releases/latest", token)
    assets = data.get("assets", []) if data else []
    cache.put("release", full_name, assets)
    return assets


def fetch_advisories(
    full_name: str, *, token: str | None, refresh: bool = False
) -> list[dict[str, Any]]:
    """Return published security advisories for the repo, or []."""
    if not refresh:
        cached = cache.get("advisories", full_name)
        if cached is not None:
            return cached
    try:
        data = _request(
            f"{GH_API}/repos/{full_name}/security-advisories",
            token,
            params={"state": "published"},
        )
    except NetworkError:
        data = []
    advisories = data if isinstance(data, list) else []
    cache.put("advisories", full_name, advisories)
    return advisories


def get_token(override: str | None = None) -> str | None:
    from app.core.config import settings  # local import avoids circular import
    return override or settings.github_token or os.environ.get("GITHUB_TOKEN")


def get_repo(
    full_name: str, *, token: str | None = None, refresh: bool = False
) -> dict[str, Any] | None:
    """Fetch a single repo's metadata, or None if not found."""
    if not refresh:
        cached = cache.get("repo", full_name)
        if cached is not None:
            return cached
    data = _request(f"{GH_API}/repos/{quote(full_name, safe='/')}", token)
    if data is None:
        return None
    cache.put("repo", full_name, data)
    return data
