from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.models import ModelMetric
from app.db.session import get_db
from app.repositories import model_repository
from app.schemas.model import ModelActiveResponse
from app.services.model_manager import get_manager

router = APIRouter()


@router.get("/models/active", response_model=ModelActiveResponse)
def active_model(db: Session = Depends(get_db)):
    s = get_settings()
    mv = model_repository.get_active(db, s.MODEL_VERSION)
    if mv is None:
        raise HTTPException(status_code=404, detail="no active model")
    rows = db.query(ModelMetric).filter(ModelMetric.model_version_id == mv.id).all()
    metrics = {r.split_name: {"mae": float(r.mae), "rmse": float(r.rmse),
                              "mape": float(r.mape), "r2": float(r.r2)} for r in rows}
    if not metrics and get_manager().loaded:
        metrics = get_manager().metrics
    return ModelActiveResponse(model_version=mv.version, model_name=mv.model_name, active=mv.active,
                               artifact_path=mv.artifact_path, metrics=metrics)


@router.get("/models")
def list_models(db: Session = Depends(get_db)):
    from app.db.models import ModelVersion
    out = []
    for mv in db.query(ModelVersion).order_by(ModelVersion.trained_at.desc()).all():
        rows = db.query(ModelMetric).filter(ModelMetric.model_version_id == mv.id).all()
        out.append({"model_version": mv.version, "model_name": mv.model_name, "active": mv.active,
                    "dataset_id": str(mv.dataset_id) if mv.dataset_id else None,
                    "artifact_path": mv.artifact_path, "trained_at": mv.trained_at,
                    "metrics": {r.split_name: {"mae": float(r.mae), "rmse": float(r.rmse),
                                               "mape": float(r.mape), "r2": float(r.r2)} for r in rows}})
    return {"models": out}
