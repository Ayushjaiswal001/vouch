"""SQLite TTL cache for API responses."""

from __future__ import annotations

import json
import sqlite3
import time
from pathlib import Path
from typing import Any

CACHE_PATH = Path(__file__).resolve().parent.parent / "cache.db"

TTL_SECONDS = {
    "scorecard": 7 * 24 * 3600,
    "repo": 24 * 3600,
    "release": 24 * 3600,
    "advisories": 24 * 3600,
    "search": 3600,
}


def _conn() -> sqlite3.Connection:
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(CACHE_PATH)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS entries ("
        "kind TEXT NOT NULL,"
        "key TEXT NOT NULL,"
        "payload TEXT NOT NULL,"
        "fetched_at REAL NOT NULL,"
        "PRIMARY KEY (kind, key))"
    )
    return conn


def get(kind: str, key: str) -> Any | None:
    """Return cached payload if present and fresh, else None."""
    ttl = TTL_SECONDS.get(kind, 3600)
    with _conn() as conn:
        row = conn.execute(
            "SELECT payload, fetched_at FROM entries WHERE kind=? AND key=?",
            (kind, key),
        ).fetchone()
    if row is None:
        return None
    payload, fetched_at = row
    if time.time() - fetched_at > ttl:
        return None
    return json.loads(payload)


def put(kind: str, key: str, payload: Any) -> None:
    with _conn() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO entries (kind, key, payload, fetched_at) "
            "VALUES (?, ?, ?, ?)",
            (kind, key, json.dumps(payload), time.time()),
        )


def clear() -> None:
    with _conn() as conn:
        conn.execute("DELETE FROM entries")
