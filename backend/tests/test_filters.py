"""Tests for filters.passes_baseline."""

from app.services import filters


def test_healthy_repo_passes(healthy_repo):
    ok, reason = filters.passes_baseline(healthy_repo)
    assert ok, reason
    assert reason == ""


def test_archived_dropped(archived_repo):
    ok, reason = filters.passes_baseline(archived_repo)
    assert not ok
    assert "archived" in reason


def test_fork_dropped(fork_repo):
    ok, reason = filters.passes_baseline(fork_repo)
    assert not ok
    assert "fork" in reason


def test_no_license_dropped(no_license_repo):
    ok, reason = filters.passes_baseline(no_license_repo)
    assert not ok
    assert "license" in reason


def test_young_dropped(young_repo):
    ok, reason = filters.passes_baseline(young_repo)
    assert not ok
    assert "1 year" in reason


def test_stale_dropped(stale_repo):
    ok, reason = filters.passes_baseline(stale_repo)
    assert not ok
    assert "12 months" in reason


def test_low_stars_dropped(low_star_repo):
    ok, reason = filters.passes_baseline(low_star_repo)
    assert not ok
    assert "stars" in reason


def test_relaxed_ignores_stars_age(low_star_repo, young_repo, stale_repo):
    ok, _ = filters.passes_baseline(low_star_repo, relaxed=True)
    assert ok
    ok, _ = filters.passes_baseline(young_repo, relaxed=True)
    assert ok
    ok, _ = filters.passes_baseline(stale_repo, relaxed=True)
    assert ok


def test_relaxed_still_drops_archived_and_unlicensed(archived_repo, no_license_repo):
    ok, _ = filters.passes_baseline(archived_repo, relaxed=True)
    assert not ok
    ok, _ = filters.passes_baseline(no_license_repo, relaxed=True)
    assert not ok
