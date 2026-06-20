"""Shared pytest fixtures."""

from datetime import datetime, timedelta, timezone

import pytest


def _iso(days_ago: int) -> str:
    dt = datetime.now(timezone.utc) - timedelta(days=days_ago)
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


@pytest.fixture
def healthy_repo():
    return {
        "full_name": "neovim/neovim",
        "html_url": "https://github.com/neovim/neovim",
        "stargazers_count": 84000,
        "license": {"spdx_id": "Apache-2.0"},
        "created_at": _iso(3500),
        "pushed_at": _iso(2),
        "archived": False,
        "fork": False,
        "language": "C",
        "topics": ["editor", "vim", "nvim"],
        "description": "Vim-fork focused on extensibility and usability",
    }


@pytest.fixture
def archived_repo(healthy_repo):
    r = dict(healthy_repo)
    r["archived"] = True
    return r


@pytest.fixture
def fork_repo(healthy_repo):
    r = dict(healthy_repo)
    r["fork"] = True
    return r


@pytest.fixture
def no_license_repo(healthy_repo):
    r = dict(healthy_repo)
    r["license"] = None
    return r


@pytest.fixture
def young_repo(healthy_repo):
    r = dict(healthy_repo)
    r["created_at"] = _iso(100)
    return r


@pytest.fixture
def stale_repo(healthy_repo):
    r = dict(healthy_repo)
    r["pushed_at"] = _iso(500)
    return r


@pytest.fixture
def low_star_repo(healthy_repo):
    r = dict(healthy_repo)
    r["stargazers_count"] = 50
    return r


@pytest.fixture
def electron_repo(healthy_repo):
    r = dict(healthy_repo)
    r["language"] = "JavaScript"
    r["topics"] = ["editor", "electron"]
    r["description"] = "An Electron-based editor"
    return r


@pytest.fixture
def rust_repo(healthy_repo):
    r = dict(healthy_repo)
    r["language"] = "Rust"
    r["topics"] = ["editor", "rust"]
    r["description"] = "A modern editor written in Rust for Windows"
    return r
