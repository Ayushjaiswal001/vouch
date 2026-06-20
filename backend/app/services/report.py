"""Markdown report rendering."""

from __future__ import annotations

import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .filters import _parse_dt
from .pc_fit import format_size

REPORTS_DIR = Path(__file__).resolve().parent.parent / "reports"


def _slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:60] or "query"


def _human_age(pushed: str) -> str:
    days = (datetime.now(timezone.utc) - _parse_dt(pushed)).days
    if days < 1:
        return "today"
    if days < 30:
        return f"{days}d ago"
    if days < 365:
        return f"{days // 30}mo ago"
    return f"{days // 365}y ago"


def _format_stars(n: int) -> str:
    if n >= 1000:
        return f"{n / 1000:.1f}k"
    return str(n)


def _why_safe(item: dict[str, Any]) -> str:
    parts: list[str] = []
    sc = item["enrichment"].get("scorecard")
    if sc:
        parts.append(f"Scorecard {sc['score']:.1f}/10")
        checks = sc.get("checks", {})
        if checks.get("Code-Review", -1) >= 7:
            parts.append("code-review enforced")
        if checks.get("Signed-Releases", -1) >= 7:
            parts.append("signed releases")
        if checks.get("Dangerous-Workflow", -1) >= 7:
            parts.append("no dangerous workflows")
    else:
        parts.append("Scorecard not indexed (treated as moderate)")
    if not item["enrichment"]["advisories"]:
        parts.append("no published advisories")
    elif not item["enrichment"]["has_high"] and not item["enrichment"]["has_critical"]:
        parts.append("no high/critical advisories")
    parts.append(f"{item['repo']['license']['spdx_id']} license")
    return "; ".join(parts)


def render(
    *,
    query: str,
    top: list[dict[str, Any]],
    dropped: list[tuple[dict[str, Any], str]],
    considered: int,
    out_dir: Path | None = None,
) -> Path:
    out_dir = out_dir or REPORTS_DIR
    out_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).astimezone()
    fname = f"{ts.strftime('%Y-%m-%d-%H%M%S')}-{_slug(query)}.md"
    path = out_dir / fname

    lines: list[str] = []
    lines.append(f"# Top {len(top)} open-source `{query}`")
    lines.append("")
    lines.append(f"_Generated {ts.strftime('%Y-%m-%d %H:%M %Z')} by find-oss_")
    lines.append("")
    lines.append(f"Candidates considered: **{considered}**  •  Dropped: **{len(dropped)}**")
    lines.append("")

    lines.append("| # | Name | Stars | License | Last commit | Scorecard | Win install | Stack | Description |")
    lines.append("|---|------|------:|---------|-------------|----------:|------------:|-------|-------------|")
    for i, item in enumerate(top, start=1):
        r = item["repo"]
        sc = item["enrichment"].get("scorecard")
        sc_str = f"{sc['score']:.1f}" if sc else "n/a"
        size_str = format_size(item["pc_details"].get("win_install_bytes"))
        stack = item["pc_details"].get("stack", "neutral")
        desc = (r.get("description") or "").replace("|", "\\|").replace("\n", " ")[:120]
        lines.append(
            f"| {i} | [{r['full_name']}]({r['html_url']}) | "
            f"{_format_stars(r['stargazers_count'])} | "
            f"{r['license']['spdx_id']} | "
            f"{_human_age(r['pushed_at'])} | "
            f"{sc_str} | {size_str} | {stack} | {desc} |"
        )
    lines.append("")

    lines.append("## Why each is safe")
    lines.append("")
    for i, item in enumerate(top, start=1):
        r = item["repo"]
        lines.append(f"{i}. **{r['full_name']}** — {_why_safe(item)}.")
    lines.append("")

    if dropped:
        lines.append("## Skipped (and why)")
        lines.append("")
        for r, reason in dropped:
            name = r.get("full_name", "?")
            lines.append(f"- `{name}` — {reason}")
        lines.append("")

    lines.append("---")
    lines.append("")
    lines.append(
        "_Scoring: `0.40 * safety + 0.30 * popularity + 0.15 * maintenance + 0.15 * pc_fit`. "
        "Safety draws from OSSF Scorecard and GitHub Security Advisories. "
        "pc_fit favors native stacks (Rust/Go/C/C++/Qt) and small Windows installers._"
    )

    path.write_text("\n".join(lines), encoding="utf-8")
    return path


def open_in_default(path: Path) -> None:
    """Open the file with the OS default app."""
    if os.name == "nt":
        os.startfile(str(path))
    else:
        import subprocess
        subprocess.Popen(["xdg-open", str(path)])
