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


def run_etl(db: Session, raw, filename: str, mode: str) -> dict:
    s = get_settings()
    mode = normalize_mode(mode)
    ds = _get_or_create_dataset(db)
    job = EtlJob(dataset_id=ds.id, status="RUNNING", mode=mode, filename=filename)
    db.add(job)
    db.flush()
    try:
        reader = csv.DictReader(io.TextIOWrapper(raw, encoding="utf-8-sig", newline=""))
        if not reader.fieldnames or not REQUIRED.issubset(set(reader.fieldnames or [])):
            missing = sorted(REQUIRED - set(reader.fieldnames or []))
            raise ValueError(f"kolom wajib hilang: {', '.join(missing)}")
    except ValueError:
        raise
    except (UnicodeDecodeError, csv.Error) as e:
        raise ValueError(f"gagal membaca CSV: {e}") from e
    if mode == "replace":
        db.query(Listing).filter(Listing.dataset_id == ds.id).delete()
    total_rows = valid_rows = rejected = 0
    batch = []
    try:
        for r in reader:
            total_rows += 1
            parsed = _parse_row(r, s)
            if parsed is None:
                rejected += 1
                continue
            valid_rows += 1
            batch.append(Listing(dataset_id=ds.id, **parsed))
            if len(batch) >= CHUNK:
                db.bulk_save_objects(batch)
                batch = []
    except (UnicodeDecodeError, csv.Error) as e:
        raise ValueError(f"gagal membaca CSV: {e}") from e
    if not total_rows:
        raise ValueError("CSV kosong, tidak ada baris data")
    if not valid_rows:
        raise ValueError(f"tidak ada baris valid (total {total_rows}, ditolak {rejected})")
    if batch:
        db.bulk_save_objects(batch)
    total_listings = db.query(Listing).filter(Listing.dataset_id == ds.id).count()
    ds.status, ds.row_count = "READY", total_listings
    ds.valid_rows = (ds.valid_rows or 0) + valid_rows if mode == "append" else valid_rows
    ds.rejected_rows = (ds.rejected_rows or 0) + rejected if mode == "append" else rejected
    job.status, job.total_rows, job.valid_rows, job.rejected_rows = "SUCCEEDED", total_rows, valid_rows, rejected
    db.commit()
    logger.info("etl %s %s mode=%s valid=%d rejected=%d", job.id, filename, mode, valid_rows, rejected)
    return {"etl_job_id": str(job.id), "dataset_id": str(ds.id), "dataset_version": ds.version,
            "mode": mode, "filename": filename, "total_rows": total_rows,
            "valid_rows": valid_rows, "rejected_rows": rejected,
            "inserted_rows": valid_rows, "replaced": mode == "replace",
            "dataset_total": total_listings, "status": job.status}
