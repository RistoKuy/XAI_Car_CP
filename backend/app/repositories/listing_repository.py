import csv

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models import Listing

CHUNK = 2000


def count(db: Session) -> int:
    return db.query(func.count(Listing.id)).scalar() or 0


def _base(db: Session, f: dict | None = None):
    q = db.query(Listing)
    if not f:
        return q
    if f.get("brand"):
        q = q.filter(Listing.brand == f["brand"])
    if f.get("location"):
        q = q.filter(Listing.location == f["location"])
    if f.get("machine_type"):
        q = q.filter(Listing.machine_type == f["machine_type"])
    if f.get("year_min") is not None:
        q = q.filter(Listing.year >= f["year_min"])
    if f.get("year_max") is not None:
        q = q.filter(Listing.year <= f["year_max"])
    return q


def seed_from_csv(db: Session, dataset_id, path: str) -> int:
    with open(path, newline="", encoding="utf-8") as f:
        rows = [r for r in csv.DictReader(f) if r.get("listing__type") in ("Bekas", "Used")]
    batch, total = [], 0
    for r in rows:
        batch.append(Listing(dataset_id=dataset_id, listing_type=r["listing__type"], brand=r["brand"],
                             brand_type=r["brand_type"], machine_type=r["machine_type"], location=r["location"],
                             year=int(r["year"]), km_1=int(float(r["KM_1"])), km_2=int(float(r["KM_2"])),
                             price=int(float(r["price"]))))
        if len(batch) >= CHUNK:
            db.bulk_save_objects(batch)
            total += len(batch)
            batch = []
    if batch:
        db.bulk_save_objects(batch)
        total += len(batch)
    db.commit()
    return total


def overview(db: Session, f: dict | None = None) -> dict:
    row = _base(db, f).with_entities(func.count(Listing.id), func.min(Listing.price), func.avg(Listing.price),
                   func.max(Listing.price), func.min(Listing.year), func.avg(Listing.year),
                   func.max(Listing.year), func.avg(Listing.km_1),
                   func.count(func.distinct(Listing.brand)),
                   func.count(func.distinct(Listing.location))).first()
    return {"total": row[0] or 0, "price_min": row[1], "price_avg": row[2], "price_max": row[3],
            "year_min": row[4], "year_avg": row[5], "year_max": row[6], "km_avg": row[7],
            "brands": row[8] or 0, "locations": row[9] or 0}


def top_brands(db: Session, n: int = 10, f: dict | None = None) -> list[dict]:
    rows = _base(db, f).with_entities(Listing.brand, func.count(Listing.id), func.avg(Listing.price)).group_by(
        Listing.brand).order_by(func.count(Listing.id).desc()).limit(n).all()
    return [{"brand": b, "count": c, "avg_price": float(a)} for b, c, a in rows]


def by_column(db: Session, col, f: dict | None = None) -> list[dict]:
    return [{"value": v, "count": c} for v, c in
            _base(db, f).with_entities(col, func.count(Listing.id)).group_by(col).order_by(col).all()]


def prices(db: Session, f: dict | None = None) -> list[int]:
    return [p for (p,) in _base(db, f).with_entities(Listing.price).all()]
