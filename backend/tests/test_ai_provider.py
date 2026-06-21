import pytest
from app.ai import provider
from app.services import search


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


def test_get_token_prefers_settings_over_env(monkeypatch):
    monkeypatch.setattr(search, "os", type("os", (), {"environ": {"GITHUB_TOKEN": "env-token"}})())
    from app.core.config import settings
    monkeypatch.setattr(settings, "github_token", "settings-token", raising=False)
    assert search.get_token() == "settings-token"


def test_get_token_falls_back_to_env(monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "github_token", None, raising=False)
    monkeypatch.setenv("GITHUB_TOKEN", "env-token")
    assert search.get_token() == "env-token"
