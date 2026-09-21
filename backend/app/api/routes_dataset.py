from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

import uuid as uuid_lib

from app.core.config import get_settings
from app.db.models import Dataset, EtlJob
from app.db.session import get_db
from app.services import etl_service
router = APIRouter()


@router.post("/datasets/upload")
def upload_dataset(mode: str = Form("append"), file: UploadFile = File(...),
                   db: Session = Depends(get_db)):
    s = get_settings()
    try:
        canonical = etl_service.normalize_mode(mode)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="file harus berformat .csv")
    raw = file.file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="file kosong")
    if len(raw) > s.MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"file melebihi batas {s.MAX_UPLOAD_MB}MB")
    try:
        return etl_service.run_etl(db, raw, file.filename, canonical)
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/datasets")
def list_datasets(db: Session = Depends(get_db)):
    out = []
    for ds in db.query(Dataset).order_by(Dataset.created_at.desc()).all():
        jobs = db.query(EtlJob).filter(EtlJob.dataset_id == ds.id).order_by(
            EtlJob.started_at.desc()).limit(5).all()
        out.append({"dataset_id": str(ds.id), "name": ds.name, "version": ds.version,
                    "status": ds.status or "READY", "total_listings": _count_for(db, ds.id),
                    "valid_rows": ds.valid_rows or 0, "rejected_rows": ds.rejected_rows or 0,
                    "recent_jobs": [{"etl_job_id": str(j.id), "mode": j.mode, "status": j.status,
                                     "filename": j.filename, "total_rows": j.total_rows,
                                     "valid_rows": j.valid_rows, "rejected_rows": j.rejected_rows}
                                    for j in jobs]})
    return {"datasets": out}


@router.get("/datasets/{dataset_id}")
def dataset_detail(dataset_id: uuid_lib.UUID, db: Session = Depends(get_db)):
    ds = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if ds is None:
        raise HTTPException(status_code=404, detail="dataset not found")
    jobs = db.query(EtlJob).filter(EtlJob.dataset_id == ds.id).order_by(
        EtlJob.started_at.desc()).limit(20).all()
    return {"dataset_id": str(ds.id), "name": ds.name, "source": ds.source, "version": ds.version,
            "status": ds.status or "READY", "total_listings": _count_for(db, ds.id),
            "valid_rows": ds.valid_rows or 0, "rejected_rows": ds.rejected_rows or 0,
            "jobs": [{"etl_job_id": str(j.id), "mode": j.mode, "status": j.status,
                      "filename": j.filename, "total_rows": j.total_rows,
                      "valid_rows": j.valid_rows, "rejected_rows": j.rejected_rows,
                      "started_at": j.started_at} for j in jobs]}


def _count_for(db: Session, dataset_id) -> int:
    from sqlalchemy import func
    from app.db.models import Listing
    return db.query(func.count(Listing.id)).filter(Listing.dataset_id == dataset_id).scalar() or 0
