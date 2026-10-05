from __future__ import annotations

from typing import Any

import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin


class CategoricalPreprocessor(BaseEstimator, TransformerMixin):
    """Keep model inputs tabular while assigning stable pandas category dtypes."""

    def __init__(self, features: list[str], categorical_features: list[str]) -> None:
        self.features = features
        self.categorical_features = categorical_features

    def fit(self, X: pd.DataFrame, y: Any = None) -> "CategoricalPreprocessor":
        frame = X.loc[:, self.features]
        self.categories_ = {
            feature: list(frame[feature].dropna().unique())
            for feature in self.categorical_features
        }
        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        frame = X.loc[:, self.features].copy()
        for feature in self.categorical_features:
            categories = self.categories_[feature]
            values = frame[feature].where(frame[feature].isin(categories), pd.NA)
            frame[feature] = pd.Series(pd.Categorical(values, categories=categories), index=frame.index)
        return frame

    def get_feature_names_out(self, input_features: Any = None) -> list[str]:
        return list(self.features)
