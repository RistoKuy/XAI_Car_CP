import os
import tempfile

TMP_DB = os.path.join(tempfile.gettempdir(), "test_carprice.db")
if os.path.exists(TMP_DB):
    os.remove(TMP_DB)

os.environ["DATABASE_URL"] = f"sqlite:///{TMP_DB}"
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ["MODEL_DIR"] = os.path.join(ROOT, "artifacts", "models", "xgboost", "xgb-v1")
os.environ["MODEL_VERSION"] = "xgb-v1"
os.environ["INFERENCE_TIMEOUT_S"] = "30"

import pytest
from fastapi.testclient import TestClient

from app.db.models import Base
from app.db.session import SessionLocal, engine
from app.main import create_app


@pytest.fixture(scope="session")
def client():
    Base.metadata.create_all(bind=engine)
    with TestClient(create_app()) as c:
        yield c
    Base.metadata.drop_all(bind=engine)
