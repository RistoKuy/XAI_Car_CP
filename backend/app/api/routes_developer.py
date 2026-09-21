from fastapi import APIRouter
from sqlalchemy import func
from sqlalchemy.orm import Session
from fastapi import Depends

from app.core.config import get_settings
from app.db.models import Dataset, EtlJob, Listing, ModelVersion, Prediction
from app.db.session import get_db
from app.repositories import model_repository
from app.services.model_manager import get_manager

router = APIRouter()


@router.get("/developer/overview")
def developer_overview(db: Session = Depends(get_db)):
    s = get_settings()
    mgr = get_manager()
    ds = db.query(Dataset).filter(Dataset.name == s.DATASET_NAME).first()
    listings = db.query(func.count(Listing.id)).scalar() or 0
    predictions = db.query(func.count(Prediction.id)).scalar() or 0
    jobs_total = db.query(func.count(EtlJob.id)).scalar() or 0
    last_job = db.query(EtlJob).order_by(EtlJob.started_at.desc()).first()
    mv = model_repository.get_active(db, s.MODEL_VERSION)
    return {
        "backend": {"status": "ok" if mgr.loaded else "model-not-loaded",
                    "model_version": s.MODEL_VERSION, "model_loaded": mgr.loaded},
        "database": {"listings": listings, "datasets": db.query(func.count(Dataset.id)).scalar() or 0,
                     "predictions": predictions},
        "dataset_active": None if ds is None else {
            "dataset_id": str(ds.id), "name": ds.name, "version": ds.version,
            "status": ds.status or "READY", "total_listings": listings},
        "model_active": None if mv is None else {
            "version": mv.version, "model_name": mv.model_name, "active": mv.active},
        "etl": {"jobs_total": jobs_total, "ready": True,
                "last_job": None if last_job is None else {
                    "etl_job_id": str(last_job.id), "mode": last_job.mode,
                    "status": last_job.status, "filename": last_job.filename,
                    "valid_rows": last_job.valid_rows, "rejected_rows": last_job.rejected_rows}},
    }
