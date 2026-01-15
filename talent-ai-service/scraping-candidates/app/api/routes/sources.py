from fastapi import APIRouter
from app.sources.registry import list_sources, describe_sources

router = APIRouter()


@router.get("")
def get_sources():
    return {"sources": list_sources(), "details": describe_sources()}
