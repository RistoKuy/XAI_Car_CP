from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.stats import DatasetStatsResponse
from app.services import stats_service

router = APIRouter()


@router.get("/stats/dataset", response_model=DatasetStatsResponse)
def dataset_stats(db: Session = Depends(get_db),
                  brand: Optional[str] = Query(default=None, max_length=64),
                  location: Optional[str] = Query(default=None, max_length=64),
                  machine_type: Optional[str] = Query(default=None, max_length=32),
                  year_min: Optional[int] = Query(default=None, ge=1900, le=2100),
                  year_max: Optional[int] = Query(default=None, ge=1900, le=2100)):
    return stats_service.dataset_stats(db, f={"brand": brand, "location": location,
                                              "machine_type": machine_type,
                                              "year_min": year_min, "year_max": year_max})
