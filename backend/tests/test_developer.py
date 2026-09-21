import io

import pytest

from app.db.models import EtlJob, Listing
from app.db.session import SessionLocal


@pytest.fixture(autouse=True)
def _clean():
    _wipe()
    yield
    _wipe()


def _wipe():
    db = SessionLocal()
    db.query(Listing).delete()
    db.query(EtlJob).delete()
    db.commit()
    db.close()


CSV_OK = ("brand,brand_type,machine_type,location,year,KM_1,KM_2,price,listing__type\n"
          "Honda,City 1.5 E Sedan,Automatic,DKI Jakarta,2021,45000,45000,285000000,Bekas\n")


def _upload(client):
    return client.post("/api/v1/datasets/upload", data={"mode": "update"},
                       files={"file": ("data.csv", io.BytesIO(CSV_OK.encode()), "text/csv")})


def test_developer_overview(client):
    r = client.get("/api/v1/developer/overview")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["backend"]["status"] == "ok"
    assert body["model_active"]["version"] == "xgb-v1"
    assert body["etl"]["ready"] is True


def test_etl_jobs_and_dataset_detail(client):
    _upload(client)
    jobs = client.get("/api/v1/etl/jobs").json()["jobs"]
    assert len(jobs) >= 1
    assert jobs[0]["mode"] == "append"
    ds_id = client.get("/api/v1/datasets").json()["datasets"][0]["dataset_id"]
    d = client.get(f"/api/v1/datasets/{ds_id}")
    assert d.status_code == 200, d.text
    assert d.json()["total_listings"] >= 1
    assert client.get("/api/v1/datasets/00000000-0000-0000-0000-000000000000").status_code == 404


def test_list_models(client):
    r = client.get("/api/v1/models")
    assert r.status_code == 200, r.text
    models = r.json()["models"]
    assert any(m["model_version"] == "xgb-v1" and m["active"] for m in models)
