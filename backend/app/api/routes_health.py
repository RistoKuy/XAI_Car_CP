from fastapi import APIRouter, HTTPException

from app.core.config import get_settings
from app.services.model_manager import get_manager

router = APIRouter()


@router.get("/health")
def health():
    s = get_settings()
    if not get_manager().loaded:
        raise HTTPException(status_code=503, detail="model not loaded")
    return {"status": "ok", "model_version": s.MODEL_VERSION}
