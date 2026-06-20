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
