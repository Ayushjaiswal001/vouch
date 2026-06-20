import pytest
from app.ai import provider


def test_not_configured_raises(monkeypatch):
    monkeypatch.setattr(provider.settings, "llm_api_key", None, raising=False)
    assert provider.is_configured() is False
    with pytest.raises(provider.LLMUnavailable):
        provider.complete("sys", "user")


def test_http_error_wrapped(monkeypatch):
    monkeypatch.setattr(provider.settings, "llm_api_key", "k", raising=False)

    class FakeResp:
        ok = False
        status_code = 500
        text = "boom"

    monkeypatch.setattr(provider.requests, "post", lambda *a, **k: FakeResp())
    with pytest.raises(provider.LLMUnavailable):
        provider.complete("sys", "user")


def test_happy_path_returns_content(monkeypatch):
    monkeypatch.setattr(provider.settings, "llm_api_key", "k", raising=False)

    class FakeResp:
        ok = True
        status_code = 200

        def json(self):
            return {"choices": [{"message": {"content": "{\"summary\":\"x\",\"picks\":[]}"}}]}

    monkeypatch.setattr(provider.requests, "post", lambda *a, **k: FakeResp())
    out = provider.complete("sys", "user")
    assert "summary" in out
