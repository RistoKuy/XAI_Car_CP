from sqlalchemy.orm import Session

from app.core.logging import logger
from app.db.models import Listing
from app.repositories import listing_repository


def dataset_stats(db: Session, bins: int = 12, f: dict | None = None) -> dict:
    seeded = listing_repository.count(db) > 0
    ov = listing_repository.overview(db, f)
    total = ov["total"]
    stats = {**ov, "seeded": seeded, "filters": {k: v for k, v in (f or {}).items() if v is not None},
             "top_brands": [], "by_location": [], "by_year": [], "by_machine": [], "price_histogram": []}
    if total == 0:
        return stats
    stats["price_avg"] = float(ov["price_avg"]) if ov["price_avg"] is not None else None
    stats["year_avg"] = float(ov["year_avg"]) if ov["year_avg"] is not None else None
    stats["km_avg"] = float(ov["km_avg"]) if ov["km_avg"] is not None else None
    stats["top_brands"] = listing_repository.top_brands(db, f=f)
    stats["by_location"] = [{"location": r["value"], "count": r["count"]}
                            for r in listing_repository.by_column(db, Listing.location, f)]
    stats["by_year"] = [{"year": r["value"], "count": r["count"]}
                        for r in listing_repository.by_column(db, Listing.year, f)]
    stats["by_machine"] = [{"machine_type": r["value"], "count": r["count"]}
                           for r in listing_repository.by_column(db, Listing.machine_type, f)]
    prices = sorted(listing_repository.prices(db, f))
    lo, hi = prices[0], prices[-1]
    width = max(1, (hi - lo) / bins)
    buckets = [{"min": lo + i * width, "max": lo + (i + 1) * width, "count": 0} for i in range(bins)]
    for p in prices:
        buckets[min(bins - 1, int((p - lo) / width))]["count"] += 1
    stats["price_histogram"] = buckets
    return stats


def seed_if_empty(db: Session, dataset_id, path: str, enabled: bool, fallback: str | None = None) -> int:
    if not enabled or listing_repository.count(db) > 0:
        return 0
    for candidate in ([path] + ([fallback] if fallback and fallback != path else [])):
        try:
            n = listing_repository.seed_from_csv(db, dataset_id, candidate)
            logger.info("seeded %d listings from %s", n, candidate)
            return n
        except OSError as e:
            logger.warning("seed skipped (%s not found): %s", candidate, e)
    return 0
