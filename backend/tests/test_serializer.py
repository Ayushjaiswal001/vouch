from app.serializers import serialize_item


def _fake_item():
    return {
        "repo": {
            "full_name": "neovim/neovim",
            "html_url": "https://github.com/neovim/neovim",
            "description": "vim fork",
            "stargazers_count": 84000,
            "license": {"spdx_id": "Apache-2.0"},
            "pushed_at": "2026-06-01T00:00:00Z",
            "created_at": "2015-01-01T00:00:00Z",
            "language": "C",
            "topics": ["editor"],
        },
        "enrichment": {
            "scorecard": {"score": 8.4, "checks": {"Maintained": 10}},
            "advisories": [],
            "has_high": False,
            "has_critical": False,
        },
        "pc_details": {"stack": "C", "win_install_bytes": 38_000_000},
        "score_total": 0.83,
        "safety_score": 0.84,
        "pop_score": 0.98,
        "maint_score": 1.0,
        "pc_score": 0.8,
    }


def test_serialize_item_shape():
    out = serialize_item(_fake_item())
    assert out["full_name"] == "neovim/neovim"
    assert out["license"] == "Apache-2.0"
    assert out["scorecard"]["score"] == 8.4
    assert out["scores"]["total"] == 0.83
    assert out["pc_details"]["win_install_str"]  # non-empty formatted size
