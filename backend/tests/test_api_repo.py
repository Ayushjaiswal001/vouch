from fastapi.testclient import TestClient

from app.main import create_app


def _scored_item():
    return {
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


def test_repo_found(mocker):
    mocker.patch("app.api.repo.pipeline.enrich_repo", return_value=_scored_item())
    mocker.patch("app.api.repo.search.get_token", return_value=None)
    client = TestClient(create_app())
    resp = client.get("/api/repo/a/b")
    assert resp.status_code == 200
    assert resp.json()["full_name"] == "a/b"


def test_repo_not_found(mocker):
    mocker.patch("app.api.repo.pipeline.enrich_repo", return_value=None)
    mocker.patch("app.api.repo.search.get_token", return_value=None)
    client = TestClient(create_app())
    resp = client.get("/api/repo/no/such")
    assert resp.status_code == 404


def test_repo_rejects_invalid_path_without_fetching(mocker):
    # Malformed owner/name must be rejected at the edge, never reaching the
    # pipeline (guards against path/host injection into the GitHub URL).
    spy = mocker.patch("app.api.repo.pipeline.enrich_repo")
    mocker.patch("app.api.repo.search.get_token", return_value=None)
    client = TestClient(create_app())
    resp = client.get("/api/repo/ab@cd/x")
    assert resp.status_code == 404
    spy.assert_not_called()
