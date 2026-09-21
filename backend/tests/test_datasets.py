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
          "Honda,City 1.5 E Sedan,Automatic,DKI Jakarta,2021,45000,45000,285000000,Bekas\n"
          "Toyota,Avanza 1.3 G MPV,Manual,Jawa Barat,2019,60000,60000,150000000,Used\n")

CSV_ALL_BARU = ("brand,brand_type,machine_type,location,year,KM_1,KM_2,price,listing__type\n"
                "Honda,Brio 1.2 E,Manual,DKI Jakarta,2023,1000,1000,180000000,Baru\n")


def _upload(client, csv_text, mode="update", filename="data.csv"):
    return client.post("/api/v1/datasets/upload", data={"mode": mode},
                       files={"file": (filename, io.BytesIO(csv_text.encode()), "text/csv")})


def test_upload_update_then_replace(client):
    r1 = _upload(client, CSV_OK, mode="update")
    assert r1.status_code == 200, r1.text
    assert r1.json()["mode"] == "append"
    assert r1.json()["valid_rows"] == 2
    total_after_append = r1.json()["dataset_total"]

    r2 = _upload(client, CSV_OK, mode="update")
    assert r2.status_code == 200, r2.text
    assert r2.json()["dataset_total"] == total_after_append + 2

    r3 = _upload(client, CSV_OK, mode="replace")
    assert r3.status_code == 200, r3.text
    assert r3.json()["replaced"] is True
    assert r3.json()["dataset_total"] == 2


def test_upload_rejects_bad_schema(client):
    r = _upload(client, "brand,year\nHonda,2021\n", mode="update")
    assert r.status_code == 400


def test_upload_rejects_bad_mode_and_type(client):
    r = _upload(client, CSV_OK, mode="hapus-semua")
    assert r.status_code == 400
    r = client.post("/api/v1/datasets/upload", data={"mode": "update"},
                    files={"file": ("data.txt", io.BytesIO(b"x"), "text/plain")})
    assert r.status_code == 400


def test_upload_all_baru_rejected(client):
    r = _upload(client, CSV_ALL_BARU, mode="update")
    assert r.status_code == 400


def test_list_datasets(client):
    _upload(client, CSV_OK, mode="replace")
    r = client.get("/api/v1/datasets")
    assert r.status_code == 200
    assert len(r.json()["datasets"]) >= 1
