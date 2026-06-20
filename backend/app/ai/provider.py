"""OpenAI-compatible LLM client. Free-tier friendly; fails loud via LLMUnavailable."""

from __future__ import annotations

from typing import Any

import requests

from app.core.config import settings


class LLMUnavailable(RuntimeError):
    """Raised for any reason the LLM cannot return a usable answer."""


def is_configured() -> bool:
    return bool(settings.llm_api_key)


def complete(system: str, user: str, *, timeout: float = 20.0) -> str:
    """Call chat completions and return the message content.

    Raises LLMUnavailable on missing key, network error, non-2xx, or bad shape.
    """
    if not settings.llm_api_key:
        raise LLMUnavailable("no LLM API key configured")

    try:
        resp = requests.post(
            f"{settings.llm_base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.llm_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.llm_model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "temperature": 0.2,
                "response_format": {"type": "json_object"},
            },
            timeout=timeout,
        )
    except requests.RequestException as e:
        raise LLMUnavailable(f"network error: {e}") from e

    if not resp.ok:
        raise LLMUnavailable(f"LLM HTTP {resp.status_code}: {resp.text[:200]}")

    try:
        data: Any = resp.json()
        return data["choices"][0]["message"]["content"]
    except (ValueError, KeyError, IndexError, TypeError) as e:
        raise LLMUnavailable(f"unexpected LLM response: {e}") from e
