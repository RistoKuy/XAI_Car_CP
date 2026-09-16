import json

import joblib
import pandas as pd
import xgboost as xgb

from app.core.config import get_settings

FEATURES = ["year", "km_1", "brand", "machine_type", "location", "brand_type"]


class ModelManager:
    def __init__(self) -> None:
        self.loaded = False

    def load(self) -> None:
        s = get_settings()
        self.version = s.MODEL_VERSION
        self.pre = joblib.load(f"{s.MODEL_DIR}/preprocessing.joblib")
        self.booster = xgb.Booster()
        self.booster.load_model(f"{s.MODEL_DIR}/model.json")
        self.metrics = json.load(open(f"{s.MODEL_DIR}/metrics.json"))
        self.out_names = list(self.pre.get_feature_names_out())
        self.loaded = True

    def transform(self, row: dict):
        df = pd.DataFrame([{c: row[c] for c in FEATURES}])
        return self.pre.transform(df)

    def predict_row(self, row: dict) -> tuple[float, float, list[dict]]:
        Xt = self.transform(row)
        dm = xgb.DMatrix(Xt, feature_names=self.out_names)
        price = float(self.booster.predict(dm)[0])
        contrib = self.booster.predict(dm, pred_contribs=True)[0]
        base, vals = float(contrib[-1]), contrib[:-1]
        grouped: dict[str, float] = {}
        by_len = sorted(FEATURES, key=len, reverse=True)
        for name, v in zip(self.out_names, vals):
            feat = name.partition("__")[2]
            orig = feat if feat in FEATURES else next(c for c in by_len if feat.startswith(c + "_"))
            grouped[orig] = grouped.get(orig, 0.0) + float(v)
        features = [{"feature": f, "value": row[f], "shap_value": grouped.get(f, 0.0)} for f in FEATURES]
        features.sort(key=lambda d: abs(d["shap_value"]), reverse=True)
        return price, base, features


_manager = ModelManager()


def get_manager() -> ModelManager:
    return _manager
