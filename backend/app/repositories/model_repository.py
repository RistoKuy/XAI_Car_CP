import json

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.models import Dataset, ModelMetric, ModelVersion


def get_active(db: Session, version: str) -> ModelVersion | None:
    return db.query(ModelVersion).filter(ModelVersion.version == version, ModelVersion.active.is_(True)).first()


def ensure_active_version(db: Session) -> ModelVersion:
    s = get_settings()
    ds = db.query(Dataset).filter(Dataset.name == s.DATASET_NAME).first()
    if ds is None:
        ds = Dataset(name=s.DATASET_NAME, source=s.DATASET_SOURCE, version="v1")
        db.add(ds)
        db.flush()
    mv = db.query(ModelVersion).filter(ModelVersion.version == s.MODEL_VERSION).first()
    if mv is None:
        mv = ModelVersion(dataset_id=ds.id, model_name="xgboost", version=s.MODEL_VERSION,
                          artifact_path=f"{s.MODEL_DIR}/model.json",
                          preprocessing_path=f"{s.MODEL_DIR}/preprocessing.joblib", active=True)
        db.add(mv)
        db.flush()
    else:
        mv.active = True
    try:
        metrics = json.load(open(f"{s.MODEL_DIR}/metrics.json"))
        for split, m in metrics.items():
            exists = db.query(ModelMetric).filter(ModelMetric.model_version_id == mv.id,
                                                  ModelMetric.split_name == split).first()
            if exists is None:
                db.add(ModelMetric(model_version_id=mv.id, split_name=split, mae=m["mae"],
                                   rmse=m["rmse"], mape=m["mape"], r2=m["r2"]))
    except OSError:
        pass
    db.query(ModelVersion).filter(ModelVersion.version != s.MODEL_VERSION).update({ModelVersion.active: False})
    db.commit()
    db.refresh(mv)
    return mv
