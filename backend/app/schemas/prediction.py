import uuid
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.core.config import get_settings


class PredictionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    brand: str = Field(min_length=1, max_length=64)
    brand_type: str = Field(min_length=1, max_length=128)
    machine_type: str = Field(min_length=1, max_length=32)
    location: str = Field(min_length=1, max_length=64)
    year: int
    km_1: Optional[int] = Field(default=None, ge=0)
    km_2: Optional[int] = Field(default=None, ge=0)

    @model_validator(mode="after")
    def check_bounds(self):
        s = get_settings()
        if not (s.MIN_YEAR <= self.year <= s.MAX_YEAR):
            raise ValueError(f"year must be between {s.MIN_YEAR} and {s.MAX_YEAR}")
        for k in ("km_1", "km_2"):
            v = getattr(self, k)
            if v is not None and v > s.MAX_KM:
                raise ValueError(f"{k} must be <= {s.MAX_KM}")
        if self.km_1 is None and self.km_2 is None:
            raise ValueError("at least one of km_1, km_2 is required")
        return self

    @property
    def effective_km_1(self) -> int:
        return self.km_1 if self.km_1 is not None else self.km_2


class FeatureContribution(BaseModel):
    feature: str
    value: Any
    shap_value: float


class Explanation(BaseModel):
    base_value: float
    features: list[FeatureContribution]


class PredictionResponse(BaseModel):
    prediction_id: uuid.UUID
    model_version: str
    predicted_price: int
    currency: str = "IDR"
    explanation: Explanation


class PredictionDetailResponse(PredictionResponse):
    input_payload: dict
    created_at: Any
