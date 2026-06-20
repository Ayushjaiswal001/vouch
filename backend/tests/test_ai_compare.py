from app.ai import compare


def _cands():
    return [
        {
            "full_name": "a/one",
            "description": "first",
            "stars": 9000,
            "license": "MIT",
            "language": "Rust",
            "scores": {"total": 0.8, "safety": 0.8, "popularity": 0.8, "maintenance": 0.9, "pc_fit": 0.8},
        },
        {
            "full_name": "b/two",
            "description": "second",
            "stars": 1200,
            "license": "GPL-3.0",
            "language": "C++",
            "scores": {"total": 0.6, "safety": 0.4, "popularity": 0.6, "maintenance": 0.4, "pc_fit": 0.7},
        },
    ]


def test_parse_good_json_filters_unknown_names():
    content = (
        '{"summary":"pick one","picks":['
        '{"full_name":"a/one","recommendation":"best","pros":["fast"],"cons":["young"]},'
        '{"full_name":"ghost/x","recommendation":"nope","pros":[],"cons":[]}]}'
    )
    out = compare.parse(content, {"a/one", "b/two"})
    assert out is not None
    assert [p["full_name"] for p in out["picks"]] == ["a/one"]


def test_parse_rejects_bad_json():
    assert compare.parse("not json", {"a/one"}) is None
    assert compare.parse('{"summary":"x"}', {"a/one"}) is None  # no picks


def test_parse_strips_code_fences():
    fenced = "```json\n{\"summary\":\"s\",\"picks\":[{\"full_name\":\"a/one\",\"recommendation\":\"r\",\"pros\":[],\"cons\":[]}]}\n```"
    out = compare.parse(fenced, {"a/one"})
    assert out is not None and out["picks"][0]["full_name"] == "a/one"


def test_fallback_is_deterministic_and_uses_scores():
    out = compare.fallback("editors", _cands())
    assert out["picks"][0]["full_name"] == "a/one"
    assert "no LLM" in out["summary"]
    assert out["picks"][0]["pros"]  # non-empty


def test_recommend_uses_fallback_when_not_configured(monkeypatch):
    monkeypatch.setattr(compare.provider, "is_configured", lambda: False)
    mode, rec = compare.recommend("editors", _cands())
    assert mode == "fallback"
    assert rec["picks"][0]["full_name"] == "a/one"


def test_recommend_uses_ai_when_llm_returns_valid(monkeypatch):
    monkeypatch.setattr(compare.provider, "is_configured", lambda: True)
    monkeypatch.setattr(
        compare.provider,
        "complete",
        lambda system, user, **k: '{"summary":"ai says","picks":[{"full_name":"b/two","recommendation":"niche","pros":["light"],"cons":["small"]}]}',
    )
    mode, rec = compare.recommend("editors", _cands())
    assert mode == "ai"
    assert rec["summary"] == "ai says"
    assert rec["picks"][0]["full_name"] == "b/two"


def test_recommend_falls_back_when_llm_unavailable(monkeypatch):
    monkeypatch.setattr(compare.provider, "is_configured", lambda: True)

    def boom(*a, **k):
        raise compare.provider.LLMUnavailable("down")

    monkeypatch.setattr(compare.provider, "complete", boom)
    mode, rec = compare.recommend("editors", _cands())
    assert mode == "fallback"
