"""AI compare & recommend route."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.ai import compare
from app.models.schemas import RecommendResponse
from app.serializers import serialize_item
from app.services import pipeline, search

router = APIRouter()


class RecommendRequest(BaseModel):
    query: str
    limit: int = 5


@router.post("/recommend", response_model=RecommendResponse)
def api_recommend(body: RecommendRequest) -> RecommendResponse:
    query = body.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query is empty.")
    limit = max(1, min(10, body.limit))

    token = search.get_token()
    result = pipeline.run(query, limit=limit, token=token)

    if not result.get("ok") and result.get("error_kind") == "rate_limit":
        raise HTTPException(status_code=429, detail=result.get("error"))
    if not result.get("ok") and result.get("error_kind") == "network":
        raise HTTPException(status_code=502, detail=result.get("error"))

    repos = [serialize_item(x) for x in result.get("top", [])]
    mode, rec = compare.recommend(query, repos)

    return RecommendResponse(
        ok=bool(result.get("ok")),
        mode=mode,
        query=query,
        summary=rec["summary"],
        picks=rec["picks"],
        repos=repos,
        auth=bool(token),
    )
