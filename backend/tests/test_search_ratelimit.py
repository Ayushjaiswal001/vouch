"""The 403 classifier must catch GitHub's abuse / secondary-limit responses,
not just the primary 'rate limit' text, so the API returns 429 (not 502)."""

import pytest

from app.services import search


class FakeResp:
    def __init__(self, status, text="", headers=None):
        self.status_code = status
        self.text = text
        self.headers = headers or {}
        self.ok = 200 <= status < 300

    def json(self):
        return {}


def test_request_raises_ratelimit_on_abuse(monkeypatch):
    monkeypatch.setattr(
        search.requests,
        "get",
        lambda *a, **k: FakeResp(403, "You have triggered an abuse detection mechanism"),
    )
    with pytest.raises(search.RateLimitError):
        search._request("https://api.github.com/x", None)


def test_request_raises_ratelimit_when_remaining_zero(monkeypatch):
    monkeypatch.setattr(
        search.requests,
        "get",
        lambda *a, **k: FakeResp(403, "Forbidden", {"X-RateLimit-Remaining": "0"}),
    )
    with pytest.raises(search.RateLimitError):
        search._request("https://api.github.com/x", None)


def test_request_primary_rate_limit_still_caught(monkeypatch):
    monkeypatch.setattr(
        search.requests,
        "get",
        lambda *a, **k: FakeResp(403, "API rate limit exceeded for 1.2.3.4"),
    )
    with pytest.raises(search.RateLimitError):
        search._request("https://api.github.com/x", None)
