from typing import Any

from pydantic import BaseModel


class ModelActiveResponse(BaseModel):
    model_version: str
    model_name: str
    active: bool
    artifact_path: str
    metrics: dict[str, dict[str, Any]]
