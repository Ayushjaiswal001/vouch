"""Single-repo detail route."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.models.schemas import RepoResult
from app.serializers import serialize_item
from app.services import pipeline, search

router = APIRouter()


@router.get("/repo/{owner}/{name}", response_model=RepoResult)
def api_repo(owner: str, name: str) -> RepoResult:
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
