import csv
import io
import uuid

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.logging import logger
from app.db.models import Dataset, EtlJob, Listing

REQUIRED = {"brand", "brand_type", "machine_type", "location", "year", "KM_1", "KM_2", "price", "listing__type"}
ALLOWED_TYPES = {"Bekas", "Used"}
CHUNK = 2000


def normalize_mode(mode: str | None) -> str:
    m = (mode or "append").strip().lower()
    if m in ("update", "append", "tambah", "add"):
        return "append"
    if m in ("replace", "ganti", "overwrite"):
        return "replace"
    raise ValueError("mode harus 'update' atau 'replace'")


def _get_or_create_dataset(db: Session) -> Dataset:
    s = get_settings()
    ds = db.query(Dataset).filter(Dataset.name == s.DATASET_NAME).first()
    if ds is None:
        ds = Dataset(name=s.DATASET_NAME, source=s.DATASET_SOURCE, version="v1", status="READY")
        db.add(ds)
        db.flush()
    return ds


def _parse_row(r: dict, s) -> dict | None:
    if r.get("listing__type") not in ALLOWED_TYPES:
        return None
    try:
        year = int(float(r["year"]))
        km_1 = int(float(r["KM_1"]))
        km_2 = int(float(r["KM_2"]))
        price = int(float(r["price"]))
    except (TypeError, ValueError):
        return None
    if not all(str(r.get(c) or "").strip() for c in ("brand", "brand_type", "machine_type", "location")):
        return None
    if not (s.MIN_YEAR <= year <= s.MAX_YEAR):
        return None
    if not (0 <= km_1 <= s.MAX_KM and 0 <= km_2 <= s.MAX_KM):
        return None
    if price < 0:
        return None
    return {"listing_type": r["listing__type"].strip(), "brand": r["brand"].strip(),
            "brand_type": r["brand_type"].strip(), "machine_type": r["machine_type"].strip(),
            "location": r["location"].strip(), "year": year, "km_1": km_1, "km_2": km_2, "price": price}


def run_etl(db: Session, raw: bytes, filename: str, mode: str) -> dict:
    s = get_settings()
    mode = normalize_mode(mode)
    ds = _get_or_create_dataset(db)
    job = EtlJob(dataset_id=ds.id, status="RUNNING", mode=mode, filename=filename)
    db.add(job)
    db.flush()
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError as e:
        raise ValueError(f"file bukan CSV UTF-8 valid: {e}") from e
    try:
        reader = csv.DictReader(io.StringIO(text))
        if not reader.fieldnames or not REQUIRED.issubset(set(reader.fieldnames or [])):
            missing = sorted(REQUIRED - set(reader.fieldnames or []))
            raise ValueError(f"kolom wajib hilang: {', '.join(missing)}")
        rows = list(reader)
    except ValueError:
        raise
    except Exception as e:
        raise ValueError(f"gagal membaca CSV: {e}") from e
    if not rows:
        raise ValueError("CSV kosong, tidak ada baris data")
    valid, rejected = [], 0
    for r in rows:
        parsed = _parse_row(r, s)
        if parsed is None:
            rejected += 1
        else:
            valid.append(parsed)
    if not valid:
        raise ValueError(f"tidak ada baris valid (total {len(rows)}, ditolak {rejected})")
    if mode == "replace":
        db.query(Listing).filter(Listing.dataset_id == ds.id).delete()
    batch = []
    for v in valid:
        batch.append(Listing(dataset_id=ds.id, **v))
        if len(batch) >= CHUNK:
            db.bulk_save_objects(batch)
            batch = []
    if batch:
        db.bulk_save_objects(batch)
    total_listings = db.query(Listing).filter(Listing.dataset_id == ds.id).count()
    ds.status, ds.row_count = "READY", total_listings
    ds.valid_rows = (ds.valid_rows or 0) + len(valid) if mode == "append" else len(valid)
    ds.rejected_rows = (ds.rejected_rows or 0) + rejected if mode == "append" else rejected
    job.status, job.total_rows, job.valid_rows, job.rejected_rows = "SUCCEEDED", len(rows), len(valid), rejected
    db.commit()
    logger.info("etl %s %s mode=%s valid=%d rejected=%d", job.id, filename, mode, len(valid), rejected)
    return {"etl_job_id": str(job.id), "dataset_id": str(ds.id), "dataset_version": ds.version,
            "mode": mode, "filename": filename, "total_rows": len(rows),
            "valid_rows": len(valid), "rejected_rows": rejected,
            "inserted_rows": len(valid), "replaced": mode == "replace",
            "dataset_total": total_listings, "status": job.status}
