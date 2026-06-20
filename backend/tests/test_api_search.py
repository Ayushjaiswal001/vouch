from fastapi.testclient import TestClient

from app.main import create_app


def _ok_pipeline_result():
    return {
        "ok": True,
        "query": "markdown editor",
        "considered": 3,
        "dropped": [({"full_name": "x/y", "html_url": "u"}, "archived")],
        "top": [
            {
                "repo": {
                    "full_name": "a/b",
                    "html_url": "https://github.com/a/b",
                    "description": "d",
                    "stargazers_count": 1000,
                    "license": {"spdx_id": "MIT"},
                    "pushed_at": "2026-06-01T00:00:00Z",
                    "created_at": "2020-01-01T00:00:00Z",
                    "language": "Rust",
                    "topics": [],
                },
                "enrichment": {
                    "scorecard": None,
                    "advisories": [],
                    "has_high": False,
                    "has_critical": False,
                },
                "pc_details": {"stack": "Rust", "win_install_bytes": None},
                "score_total": 0.7,
                "safety_score": 0.5,
                "pop_score": 0.6,
                "maint_score": 1.0,
                "pc_score": 0.8,
            }
        ],
    }


def test_search_empty_query_returns_400():
    client = TestClient(create_app())
    resp = client.get("/api/search?q=")
    assert resp.status_code == 400


def test_search_happy_path(mocker):
    mocker.patch("app.api.search.pipeline.run", return_value=_ok_pipeline_result())
    mocker.patch("app.api.search.search.get_token", return_value=None)
    client = TestClient(create_app())
    resp = client.get("/api/search?q=markdown+editor&limit=5")
    assert resp.status_code == 200
    body = resp.json()
    assert body["ok"] is True
    assert body["query"] == "markdown editor"
    assert body["top"][0]["full_name"] == "a/b"
    assert body["top"][0]["license"] == "MIT"
    assert body["dropped"][0]["reason"] == "archived"
    assert body["auth"] is False
