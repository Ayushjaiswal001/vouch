from fastapi.testclient import TestClient

from app.main import create_app


def _ok_result():
    return {
        "ok": True,
        "query": "editors",
        "considered": 2,
        "dropped": [],
        "top": [
            {
                "repo": {
                    "full_name": "a/one",
                    "html_url": "https://github.com/a/one",
                    "description": "first",
                    "stargazers_count": 9000,
                    "license": {"spdx_id": "MIT"},
                    "pushed_at": "2026-06-01T00:00:00Z",
                    "created_at": "2020-01-01T00:00:00Z",
                    "language": "Rust",
                    "topics": [],
                },
                "enrichment": {"scorecard": None, "advisories": [], "has_high": False, "has_critical": False},
                "pc_details": {"stack": "Rust", "win_install_bytes": None},
                "score_total": 0.8,
                "safety_score": 0.8,
                "pop_score": 0.8,
                "maint_score": 0.9,
                "pc_score": 0.8,
            }
        ],
    }


def test_recommend_empty_query_400():
    client = TestClient(create_app())
    resp = client.post("/api/recommend", json={"query": "  "})
    assert resp.status_code == 400


def test_recommend_fallback_path(mocker):
    mocker.patch("app.api.recommend.pipeline.run", return_value=_ok_result())
    mocker.patch("app.api.recommend.search.get_token", return_value=None)
    mocker.patch("app.api.recommend.compare.provider.is_configured", return_value=False)
    client = TestClient(create_app())
    resp = client.post("/api/recommend", json={"query": "editors", "limit": 5})
    assert resp.status_code == 200
    body = resp.json()
    assert body["mode"] == "fallback"
    assert body["query"] == "editors"
    assert body["repos"][0]["full_name"] == "a/one"
    assert body["picks"][0]["full_name"] == "a/one"


def test_recommend_ai_path(mocker):
    mocker.patch("app.api.recommend.pipeline.run", return_value=_ok_result())
    mocker.patch("app.api.recommend.search.get_token", return_value=None)
    mocker.patch("app.api.recommend.compare.provider.is_configured", return_value=True)
    mocker.patch(
        "app.api.recommend.compare.provider.complete",
        return_value='{"summary":"ai pick","picks":[{"full_name":"a/one","recommendation":"go","pros":["fast"],"cons":["new"]}]}',
    )
    client = TestClient(create_app())
    resp = client.post("/api/recommend", json={"query": "editors"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["mode"] == "ai"
    assert body["summary"] == "ai pick"
    assert body["picks"][0]["pros"] == ["fast"]
