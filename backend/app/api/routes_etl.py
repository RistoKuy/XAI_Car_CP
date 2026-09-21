from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.models import EtlJob
from app.db.session import get_db

router = APIRouter()


@router.get("/etl/jobs")
def list_etl_jobs(limit: int = Query(20, ge=1, le=100), db: Session = Depends(get_db)):
    rows = db.query(EtlJob).order_by(EtlJob.started_at.desc()).limit(limit).all()
    return {"jobs": [{"etl_job_id": str(j.id), "dataset_id": str(j.dataset_id) if j.dataset_id else None,
                      "mode": j.mode, "status": j.status, "filename": j.filename,
                      "total_rows": j.total_rows, "valid_rows": j.valid_rows,
                      "rejected_rows": j.rejected_rows, "error_message": j.error_message,
                      "started_at": j.started_at, "finished_at": j.finished_at} for j in rows]}
