"""Search route — wraps the discovery pipeline."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.models.schemas import SearchResponse
from app.serializers import serialize_dropped, serialize_item
from app.services import pipeline, search

router = APIRouter()


@router.get("/search", response_model=SearchResponse)
def api_search(
    q: str = Query(default=""),
    limit: int = Query(default=5, ge=1, le=20),
    relaxed: bool = Query(default=False),
    refresh: bool = Query(default=False),
) -> SearchResponse:
    query = q.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query is empty.")

    token = search.get_token()
    result = pipeline.run(
        query, limit=limit, relaxed=relaxed, refresh=refresh, token=token
    )

    if not result.get("ok") and result.get("error_kind") == "rate_limit":
        raise HTTPException(status_code=429, detail=result.get("error"))
    if not result.get("ok") and result.get("error_kind") == "network":
        raise HTTPException(status_code=502, detail=result.get("error"))

    return SearchResponse(
        ok=result["ok"],
        error=result.get("error"),
        error_kind=result.get("error_kind"),
        query=query,
        considered=result.get("considered", 0),
        dropped=serialize_dropped(result.get("dropped", [])),
        top=[serialize_item(x) for x in result.get("top", [])],
        auth=bool(token),
    )
