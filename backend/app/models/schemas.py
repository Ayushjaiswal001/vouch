"""API response contracts shared with the frontend."""

from __future__ import annotations

from pydantic import BaseModel


class Scores(BaseModel):
    total: float
    safety: float
    popularity: float
    maintenance: float
    pc_fit: float


class Scorecard(BaseModel):
    score: float | None = None
    checks: dict[str, int] = {}


class PcDetails(BaseModel):
    stack: str | None = None
    win_install_bytes: int | None = None
    win_install_str: str | None = None


class RepoResult(BaseModel):
    full_name: str
    html_url: str
    description: str = ""
    stars: int = 0
    license: str = "?"
    pushed_at: str | None = None
    created_at: str | None = None
    language: str = ""
    topics: list[str] = []
    scorecard: Scorecard | None = None
    advisories_count: int = 0
    has_high_advisory: bool = False
    has_critical_advisory: bool = False
    pc_details: PcDetails
    scores: Scores


class DroppedRepo(BaseModel):
    full_name: str
    html_url: str = ""
    reason: str


class SearchResponse(BaseModel):
    ok: bool
    error: str | None = None
    error_kind: str | None = None
    query: str
    considered: int = 0
    dropped: list[DroppedRepo] = []
    top: list[RepoResult] = []
    auth: bool = False
