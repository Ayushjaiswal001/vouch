"""Windows support + lightweight detection + release size scoring."""

from __future__ import annotations

import re
from typing import Any

NATIVE_TOKENS = {"rust", "go", "c", "c++", "cpp", "qt", "gtk", "tauri", "native", "zig"}
HEAVY_TOKENS = {"electron", "nwjs", "node-webkit"}

WIN_ASSET_PATTERNS = [
    re.compile(r"\.exe$", re.I),
    re.compile(r"\.msi$", re.I),
    re.compile(r"win.*x?64.*\.zip$", re.I),
    re.compile(r"windows.*\.zip$", re.I),
    re.compile(r"win.*setup", re.I),
]


def _signal_set(repo: dict[str, Any]) -> set[str]:
    tokens: set[str] = set()
    lang = (repo.get("language") or "").lower()
    if lang:
        tokens.add(lang)
    for t in repo.get("topics") or []:
        tokens.add(t.lower())
    desc = (repo.get("description") or "").lower()
    for word in re.findall(r"[a-z+#]+", desc):
        tokens.add(word)
    return tokens


def stack_kind(repo: dict[str, Any]) -> str:
    """Return 'native', 'heavy', or 'neutral'."""
    sig = _signal_set(repo)
    if sig & HEAVY_TOKENS:
        return "heavy"
    if sig & NATIVE_TOKENS:
        return "native"
    return "neutral"


def win_install_size(assets: list[dict[str, Any]]) -> int | None:
    """Return total bytes across Windows assets, or None if no Windows asset."""
    total = 0
    found = False
    for asset in assets:
        name = asset.get("name", "")
        if any(p.search(name) for p in WIN_ASSET_PATTERNS):
            total += int(asset.get("size", 0))
            found = True
    return total if found else None


def mentions_windows(repo: dict[str, Any]) -> bool:
    sig = _signal_set(repo)
    return "windows" in sig or "win32" in sig or "win64" in sig


def score_pc_fit(repo: dict[str, Any], assets: list[dict[str, Any]]) -> tuple[float, dict[str, Any]]:
    """Return (score in [0,1], details dict)."""
    score = 0.5
    details: dict[str, Any] = {}

    kind = stack_kind(repo)
    details["stack"] = kind
    if kind == "native":
        score += 0.3
    elif kind == "heavy":
        score -= 0.3

    size = win_install_size(assets)
    details["win_install_bytes"] = size
    if size is not None:
        mb = size / (1024 * 1024)
        if mb <= 50:
            score += 0.2
        elif mb > 500:
            score -= 0.2

    if mentions_windows(repo):
        score += 0.1
        details["mentions_windows"] = True

    score = max(0.0, min(1.0, score))
    return score, details


def format_size(bytes_: int | None) -> str:
    if bytes_ is None:
        return "—"
    mb = bytes_ / (1024 * 1024)
    if mb < 1:
        return f"{bytes_ / 1024:.0f} KB"
    if mb < 1024:
        return f"{mb:.0f} MB"
    return f"{mb / 1024:.1f} GB"
