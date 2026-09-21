from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes_health import router as health_router
from app.api.routes_dataset import router as dataset_router
from app.api.routes_developer import router as developer_router
from app.api.routes_etl import router as etl_router
from app.api.routes_model import router as model_router
from app.api.routes_prediction import router as prediction_router
from app.api.routes_stats import router as stats_router
from app.core.config import get_settings
from app.db.models import Base
from app.db.session import SessionLocal, engine
from app.repositories.model_repository import ensure_active_version
from app.services.model_manager import get_manager
from app.services.stats_service import seed_if_empty


def _ensure_etl_columns() -> None:
    from sqlalchemy import text
    stmts = [
        "ALTER TABLE datasets ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'READY'",
        "ALTER TABLE datasets ADD COLUMN IF NOT EXISTS row_count BIGINT DEFAULT 0",
        "ALTER TABLE datasets ADD COLUMN IF NOT EXISTS valid_rows BIGINT DEFAULT 0",
        "ALTER TABLE datasets ADD COLUMN IF NOT EXISTS rejected_rows BIGINT DEFAULT 0",
    ]
    with engine.begin() as conn:
        for stmt in stmts:
            try:
                conn.execute(text(stmt))
            except Exception:
                pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    get_manager().load()
    Base.metadata.create_all(bind=engine)
    _ensure_etl_columns()
    db = SessionLocal()
    try:
        mv = ensure_active_version(db)
        s = get_settings()
        seed_if_empty(db, mv.dataset_id, s.SEED_CSV_PATH, s.SEED_ON_STARTUP, s.SEED_FALLBACK_CSV_PATH)
    finally:
        db.close()
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="CarPrice XAI")
    app.router.lifespan_context = lifespan
    app.add_middleware(CORSMiddleware, allow_origins=get_settings().cors_list,
                       allow_methods=["*"], allow_headers=["*"])
    app.include_router(health_router, prefix="/api/v1")
    app.include_router(dataset_router, prefix="/api/v1")
    app.include_router(etl_router, prefix="/api/v1")
    app.include_router(developer_router, prefix="/api/v1")
    app.include_router(prediction_router, prefix="/api/v1")
    app.include_router(model_router, prefix="/api/v1")
    app.include_router(stats_router, prefix="/api/v1")
    return app


app = create_app()
