"""Single-repo detail route."""

from __future__ import annotations

import re

from fastapi import APIRouter, HTTPException

from app.models.schemas import RepoResult
from app.serializers import serialize_item
from app.services import pipeline, search

router = APIRouter()

# GitHub owner/repo segments: alphanumerics plus . _ - and never "." / "..".
_SEGMENT = re.compile(r"^[A-Za-z0-9._-]+$")


def _valid_segment(seg: str) -> bool:
    return bool(_SEGMENT.match(seg)) and seg not in (".", "..")


@router.get("/repo/{owner}/{name}", response_model=RepoResult)
def api_repo(owner: str, name: str) -> RepoResult:
    if not _valid_segment(owner) or not _valid_segment(name):
        raise HTTPException(status_code=404, detail="Invalid repository path.")
    full_name = f"{owner}/{name}"
    token = search.get_token()
    try:
        item = pipeline.enrich_repo(full_name, token=token)
    except search.RateLimitError as e:
        raise HTTPException(status_code=429, detail=str(e))
    except search.NetworkError as e:
        raise HTTPException(status_code=502, detail=str(e))
    if item is None:
        raise HTTPException(status_code=404, detail=f"Repo {full_name} not found.")
    return RepoResult(**serialize_item(item))
