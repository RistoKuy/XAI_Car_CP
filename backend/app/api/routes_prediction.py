import uuid
from concurrent.futures import ThreadPoolExecutor

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.repositories import prediction_repository
from app.schemas.prediction import PredictionDetailResponse, PredictionRequest, PredictionResponse
from app.services import prediction_service

router = APIRouter()
_pool = ThreadPoolExecutor(max_workers=4)


@router.post("/predictions", response_model=PredictionResponse)
def create_prediction(payload: PredictionRequest, db: Session = Depends(get_db)):
    timeout = get_settings().INFERENCE_TIMEOUT_S
    try:
        return _pool.submit(prediction_service.predict, payload, db).result(timeout=timeout)
    except TimeoutError:
        raise HTTPException(status_code=504, detail="inference timeout")


@router.get("/predictions/{prediction_id}", response_model=PredictionDetailResponse)
def get_prediction(prediction_id: uuid.UUID, db: Session = Depends(get_db)):
    row = prediction_repository.get(db, prediction_id)
    if row is None:
        raise HTTPException(status_code=404, detail="prediction not found")
    return PredictionDetailResponse(
        prediction_id=row.id, model_version=get_settings().MODEL_VERSION,
        predicted_price=row.predicted_price, explanation=row.shap_payload,
        input_payload=row.input_payload, created_at=row.created_at)
