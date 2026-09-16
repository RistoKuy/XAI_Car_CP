"""Baseline XGBoost CP: filter Bekas/Used, pipeline reproducible, artifact per versi."""
import json
import os

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, OrdinalEncoder
from xgboost import XGBRegressor

DATASET_PATH = os.getenv("DATASET_PATH", "./dataset.csv")
ARTIFACT_ROOT = os.getenv("ARTIFACT_ROOT", "./artifacts/models/xgboost")
MODEL_VERSION = os.getenv("MODEL_VERSION", "xgb-v1")
SEED = int(os.getenv("RANDOM_SEED", "42"))

NUM = ["year", "km_1"]
ONEHOT = ["brand", "machine_type", "location"]
ORDINAL = ["brand_type"]  # high-cardinality, encoded inside pipeline (no leakage)
FEATURES = NUM + ONEHOT + ORDINAL

df = pd.read_csv(DATASET_PATH)
df = df[df["listing__type"].isin(["Bekas", "Used"])].copy()
df = df.rename(columns={"KM_1": "km_1"})
df = df[FEATURES + ["price"]].dropna()
print(f"train rows={len(df)} features={FEATURES}")

X_train, X_test, y_train, y_test = train_test_split(df[FEATURES], df["price"], test_size=0.2, random_state=SEED)

pre = ColumnTransformer([
    ("num", "passthrough", NUM),
    ("oh", OneHotEncoder(handle_unknown="ignore"), ONEHOT),
    ("ord", OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1), ORDINAL),
])
model = XGBRegressor(n_estimators=300, max_depth=6, learning_rate=0.05,
                     subsample=0.8, colsample_bytree=0.8, random_state=SEED, n_jobs=-1)
pipe = Pipeline([("pre", pre), ("model", model)])
pipe.fit(X_train, y_train)

pred = pipe.predict(X_test)
mae = float(mean_absolute_error(y_test, pred))
rmse = float(mean_squared_error(y_test, pred) ** 0.5)
mape = float((abs(y_test - pred) / y_test).mean() * 100)
r2 = float(r2_score(y_test, pred))
print(f"MAE={mae:,.0f} RMSE={rmse:,.0f} MAPE={mape:.2f}% R2={r2:.4f}")

out = f"{ARTIFACT_ROOT}/{MODEL_VERSION}"
os.makedirs(out, exist_ok=True)
pipe.named_steps["model"].get_booster().save_model(f"{out}/model.json")
joblib.dump(pipe.named_steps["pre"], f"{out}/preprocessing.joblib")
json.dump({"features": FEATURES, "target": "price", "km_choice": "km_1 (KM_2 dropped, corr~0.999)"},
          open(f"{out}/feature_schema.json", "w"), indent=2)
json.dump({"test": {"mae": mae, "rmse": rmse, "mape": mape, "r2": r2, "n_test": len(X_test)}},
          open(f"{out}/metrics.json", "w"), indent=2)
json.dump({"model_version": MODEL_VERSION, "seed": SEED, "dataset": DATASET_PATH,
           "params": model.get_params(), "filters": ["Bekas", "Used"]},
          open(f"{out}/training_config.json", "w"), indent=2)
json.dump({"explainer": "TreeExplainer", "background_n": 100, "note": "SHAP run di backend saat inference"},
          open(f"{out}/shap_config.json", "w"), indent=2)
print(f"saved {out}/")

try:
    import shap
    Xt = pipe.named_steps["pre"].transform(X_test.iloc[:200])
    sv = shap.TreeExplainer(pipe.named_steps["model"])(Xt)
    print(f"SHAP ok: values shape={sv.values.shape} base={float(sv.base_values[0]):,.0f}")
except Exception as e:
    print(f"SHAP skipped: {e}")
