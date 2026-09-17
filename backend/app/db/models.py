import uuid

from sqlalchemy import JSON, BigInteger, Boolean, DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import Uuid


class Base(DeclarativeBase):
    pass


PayloadJSON = JSONB().with_variant(JSON(), "sqlite")


class Dataset(Base):
    __tablename__ = "datasets"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(128))
    source: Mapped[str] = mapped_column(String(256))
    version: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Listing(Base):
    __tablename__ = "listings"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    dataset_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("datasets.id"))
    listing_type: Mapped[str] = mapped_column(String(16))
    brand: Mapped[str] = mapped_column(String(64))
    brand_type: Mapped[str] = mapped_column(String(128))
    machine_type: Mapped[str] = mapped_column(String(32))
    location: Mapped[str] = mapped_column(String(64))
    year: Mapped[int]
    km_1: Mapped[int]
    km_2: Mapped[int]
    price: Mapped[int] = mapped_column(BigInteger)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ModelVersion(Base):
    __tablename__ = "model_versions"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    dataset_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("datasets.id"), nullable=True)
    model_name: Mapped[str] = mapped_column(String(64), default="xgboost")
    version: Mapped[str] = mapped_column(String(64), unique=True)
    artifact_path: Mapped[str] = mapped_column(String(512))
    preprocessing_path: Mapped[str] = mapped_column(String(512))
    trained_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    active: Mapped[bool] = mapped_column(Boolean, default=False)


class ModelMetric(Base):
    __tablename__ = "model_metrics"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    model_version_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("model_versions.id"))
    split_name: Mapped[str] = mapped_column(String(32))
    mae: Mapped[float] = mapped_column(Numeric)
    rmse: Mapped[float] = mapped_column(Numeric)
    mape: Mapped[float] = mapped_column(Numeric)
    r2: Mapped[float] = mapped_column(Numeric)


class Prediction(Base):
    __tablename__ = "predictions"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    model_version_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("model_versions.id"))
    listing_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("listings.id"), nullable=True)
    predicted_price: Mapped[int] = mapped_column(BigInteger)
    input_payload: Mapped[dict] = mapped_column(PayloadJSON)
    shap_payload: Mapped[dict] = mapped_column(PayloadJSON)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
