from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+psycopg://app@postgres:5432/carprice"
    MODEL_DIR: str = "./artifacts/models/xgboost/xgb-v1"
    MODEL_VERSION: str = "xgb-v1"
    CORS_ORIGINS: str = "http://localhost,http://localhost:80"
    INFERENCE_TIMEOUT_S: int = 10
    MIN_YEAR: int = 1930
    MAX_YEAR: int = 2026
    MAX_KM: int = 1000000
    DATASET_NAME: str = "carprice-used"
    DATASET_SOURCE: str = "dataset.csv"
    SEED_ON_STARTUP: bool = True
    SEED_CSV_PATH: str = "./data/processed/used_filtered.csv"
    SEED_FALLBACK_CSV_PATH: str = "/app/dataset.csv"

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
