from app.db.models import Dataset, Listing
from app.db.session import SessionLocal


def test_stats_empty(client):
    r = client.get("/api/v1/stats/dataset")
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 0
    assert body["seeded"] is False


def test_stats_with_data(client):
    db = SessionLocal()
    ds = db.query(Dataset).first()
    db.bulk_save_objects([
        Listing(dataset_id=ds.id, listing_type="Bekas", brand="Honda", brand_type="Brio",
                machine_type="Automatic", location="DKI Jakarta", year=2020, km_1=30000, km_2=30000, price=150000000),
        Listing(dataset_id=ds.id, listing_type="Used", brand="Toyota", brand_type="Avanza",
                machine_type="Manual", location="Jawa Barat", year=2019, km_1=50000, km_2=50000, price=170000000),
        Listing(dataset_id=ds.id, listing_type="Bekas", brand="Honda", brand_type="Jazz",
                machine_type="Automatic", location="DKI Jakarta", year=2021, km_1=20000, km_2=20000, price=200000000),
    ])
    db.commit()
    db.close()
    try:
        body = client.get("/api/v1/stats/dataset").json()
        assert body["seeded"] is True
        assert body["total"] == 3
        assert body["price_min"] == 150000000
        assert body["price_max"] == 200000000
        assert body["brands"] == 2
        assert body["top_brands"][0] == {"brand": "Honda", "count": 2, "avg_price": 175000000.0}
        assert len(body["price_histogram"]) == 12
        assert sum(b["count"] for b in body["price_histogram"]) == 3
    finally:
        db = SessionLocal()
        db.query(Listing).delete()
        db.commit()
        db.close()


def _seed_three():
    db = SessionLocal()
    ds = db.query(Dataset).first()
    db.bulk_save_objects([
        Listing(dataset_id=ds.id, listing_type="Bekas", brand="Honda", brand_type="Brio",
                machine_type="Automatic", location="DKI Jakarta", year=2020, km_1=30000, km_2=30000, price=150000000),
        Listing(dataset_id=ds.id, listing_type="Used", brand="Toyota", brand_type="Avanza",
                machine_type="Manual", location="Jawa Barat", year=2019, km_1=50000, km_2=50000, price=170000000),
        Listing(dataset_id=ds.id, listing_type="Bekas", brand="Honda", brand_type="Jazz",
                machine_type="Automatic", location="DKI Jakarta", year=2021, km_1=20000, km_2=20000, price=200000000),
    ])
    db.commit()
    db.close()


def _clear():
    db = SessionLocal()
    db.query(Listing).delete()
    db.commit()
    db.close()


def test_stats_filtered(client):
    _seed_three()
    try:
        honda = client.get("/api/v1/stats/dataset", params={"brand": "Honda"}).json()
        assert honda["total"] == 2
        assert honda["filters"] == {"brand": "Honda"}
        assert honda["price_max"] == 200000000
        assert honda["by_machine"] == [{"machine_type": "Automatic", "count": 2}]
        yr = client.get("/api/v1/stats/dataset", params={"year_min": 2020}).json()
        assert yr["total"] == 2
        assert yr["year_min"] == 2020
        loc = client.get("/api/v1/stats/dataset", params={"location": "Bali"}).json()
        assert loc["total"] == 0
        assert loc["seeded"] is True
        assert loc["top_brands"] == []
    finally:
        _clear()
