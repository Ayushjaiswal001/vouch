"""Tests for pc_fit scoring."""

from app.services import pc_fit


def test_rust_repo_scores_native(rust_repo):
    assert pc_fit.stack_kind(rust_repo) == "native"


def test_electron_repo_scores_heavy(electron_repo):
    assert pc_fit.stack_kind(electron_repo) == "heavy"


def test_neutral_repo(healthy_repo):
    healthy_repo["language"] = "Python"
    healthy_repo["topics"] = ["something"]
    healthy_repo["description"] = "just a tool"
    assert pc_fit.stack_kind(healthy_repo) == "neutral"


def test_win_install_size_small():
    assets = [{"name": "app-win-x64.zip", "size": 10 * 1024 * 1024}]
    assert pc_fit.win_install_size(assets) == 10 * 1024 * 1024


def test_win_install_size_msi():
    assets = [{"name": "Setup.msi", "size": 5_000_000}]
    assert pc_fit.win_install_size(assets) == 5_000_000


def test_win_install_size_skips_non_windows():
    assets = [
        {"name": "app.dmg", "size": 100_000_000},
        {"name": "app-linux.tar.gz", "size": 50_000_000},
    ]
    assert pc_fit.win_install_size(assets) is None


def test_native_with_small_install_scores_high(rust_repo):
    assets = [{"name": "app-windows-x64.zip", "size": 20 * 1024 * 1024}]
    s, details = pc_fit.score_pc_fit(rust_repo, assets)
    assert s >= 0.9
    assert details["stack"] == "native"


def test_electron_with_large_install_scores_low(electron_repo):
    assets = [{"name": "Setup.exe", "size": 600 * 1024 * 1024}]
    s, details = pc_fit.score_pc_fit(electron_repo, assets)
    assert s == 0.0
    assert details["stack"] == "heavy"


def test_format_size_buckets():
    assert pc_fit.format_size(None) == "—"
    assert pc_fit.format_size(500) == "0 KB"
    assert pc_fit.format_size(2 * 1024 * 1024) == "2 MB"
    assert pc_fit.format_size(2 * 1024 * 1024 * 1024) == "2.0 GB"


def test_mentions_windows(rust_repo, healthy_repo):
    assert pc_fit.mentions_windows(rust_repo)
    healthy_repo["description"] = "A tool that runs anywhere"
    healthy_repo["topics"] = []
    assert not pc_fit.mentions_windows(healthy_repo)
