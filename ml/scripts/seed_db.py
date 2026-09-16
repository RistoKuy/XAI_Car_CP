"""Seed dataset + listings + model version + metrics ke PostgreSQL (opsional, manual)."""
import os

import pandas as pd
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.db.models import Base, Dataset, Listing, ModelMetric, ModelVersion

DATABASE_URL = os.getenv("DATABASE_URL")
MODEL_VERSION = os.getenv("MODEL_VERSION", "xgb-v1")
DATASET_PATH = os.getenv("DATASET_PATH", "./dataset.csv")

engine = create_engine(DATABASE_URL)
Base.metadata.create_all(engine)

df = pd.read_csv(DATASET_PATH)
df = df[df["listing__type"].isin(["Bekas", "Used"])].copy()
print(f"seeding {len(df)} listings...")

with Session(engine) as db:
    ds = Dataset(name=os.getenv("DATASET_NAME", "carprice-used"), source=DATASET_PATH, version="v1")
    db.add(ds)
    db.flush()
    db.bulk_save_objects([Listing(dataset_id=ds.id, listing_type=r.listing__type, brand=r.brand,
                                  brand_type=r.brand_type, machine_type=r.machine_type, location=r.location,
                                  year=int(r.year), km_1=int(r.KM_1), km_2=int(r.KM_2), price=int(r.price))
                          for r in df.itertuples()])
    import json
    metrics = json.load(open(f"./artifacts/models/xgboost/{MODEL_VERSION}/metrics.json"))
    mv = ModelVersion(dataset_id=ds.id, model_name="xgboost", version=MODEL_VERSION,
                      artifact_path=f"./artifacts/models/xgboost/{MODEL_VERSION}/model.json",
                      preprocessing_path=f"./artifacts/models/xgboost/{MODEL_VERSION}/preprocessing.joblib",
                      active=True)
    db.add(mv)
    db.flush()
    for split, m in metrics.items():
        db.add(ModelMetric(model_version_id=mv.id, split_name=split, mae=m["mae"],
                           rmse=m["rmse"], mape=m["mape"], r2=m["r2"]))
    db.commit()
    print(f"seeded dataset={ds.id} model_version={MODEL_VERSION}")
