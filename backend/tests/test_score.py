"""Tests for scoring logic."""

import math

from app.services import score


def test_weights_sum_to_one():
    assert math.isclose(sum(score.WEIGHTS.values()), 1.0)


def test_popularity_curve(healthy_repo):
    healthy_repo["stargazers_count"] = 100_000
    assert score.popularity(healthy_repo) == 1.0
    healthy_repo["stargazers_count"] = 1_000
    assert 0.5 < score.popularity(healthy_repo) < 0.7
    healthy_repo["stargazers_count"] = 1
    assert score.popularity(healthy_repo) == 0.0


def test_maintenance_buckets(healthy_repo):
    from datetime import datetime, timedelta, timezone

    def push(days):
        healthy_repo["pushed_at"] = (
            datetime.now(timezone.utc) - timedelta(days=days)
        ).strftime("%Y-%m-%dT%H:%M:%SZ")

    push(10)
    assert score.maintenance(healthy_repo) == 1.0
    push(120)
    assert score.maintenance(healthy_repo) == 0.7
    push(300)
    assert score.maintenance(healthy_repo) == 0.4
    push(500)
    assert score.maintenance(healthy_repo) == 0.0


def test_safety_critical_hard_drop():
    enr = {"has_critical": True, "has_high": False, "scorecard": {"score": 9.0}}
    s, drop = score.safety(enr)
    assert drop is True
    assert s == 0.0


def test_safety_high_penalty():
    enr = {"has_critical": False, "has_high": True, "scorecard": {"score": 8.0}}
    s, drop = score.safety(enr)
    assert drop is False
    assert math.isclose(s, 0.5, abs_tol=0.001)


def test_safety_missing_scorecard():
    enr = {"has_critical": False, "has_high": False, "scorecard": None}
    s, drop = score.safety(enr)
    assert drop is False
    assert s == 0.5


def test_total_formula():
    t = score.total(safety_s=1.0, pop_s=1.0, maint_s=1.0, pc_s=1.0)
    assert math.isclose(t, 1.0)
    t = score.total(safety_s=0.0, pop_s=0.0, maint_s=0.0, pc_s=0.0)
    assert t == 0.0
