import uuid

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.logging import logger
from app.repositories import model_repository, prediction_repository
from app.schemas.prediction import Explanation, FeatureContribution, PredictionRequest, PredictionResponse
from app.services.model_manager import get_manager


def predict(payload: PredictionRequest, db: Session) -> PredictionResponse:
    s = get_settings()
    row = {"year": payload.year, "km_1": payload.effective_km_1, "brand": payload.brand,
           "machine_type": payload.machine_type, "location": payload.location,
           "brand_type": payload.brand_type}
    price, base, features = get_manager().predict_row(row)
    predicted_price = max(0, int(round(price)))
    prediction_id = uuid.uuid4()
    input_payload = payload.model_dump() | {"km_1_effective": row["km_1"]}
    shap_payload = {"base_value": base, "features": features}
    try:
        mv = model_repository.get_active(db, s.MODEL_VERSION)
        if mv is not None:
            prediction_repository.create(db, prediction_id, mv.id, predicted_price, input_payload, shap_payload)
    except Exception as e:
        logger.warning("prediction log skipped: %s", e)
        db.rollback()
    return PredictionResponse(prediction_id=prediction_id, model_version=s.MODEL_VERSION,
                              predicted_price=predicted_price,
                              explanation=Explanation(base_value=base,
                                                      features=[FeatureContribution(**f) for f in features]))
