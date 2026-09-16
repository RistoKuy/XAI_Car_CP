import uuid

from sqlalchemy.orm import Session

from app.db.models import Prediction


def create(db: Session, prediction_id: uuid.UUID, model_version_id: uuid.UUID,
           predicted_price: int, input_payload: dict, shap_payload: dict) -> Prediction:
    row = Prediction(id=prediction_id, model_version_id=model_version_id, predicted_price=predicted_price,
                     input_payload=input_payload, shap_payload=shap_payload)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def get(db: Session, prediction_id: uuid.UUID) -> Prediction | None:
    return db.query(Prediction).filter(Prediction.id == prediction_id).first()
