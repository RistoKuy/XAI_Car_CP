VALID = {"brand": "Honda", "brand_type": "City 1.5 E Sedan", "machine_type": "Automatic",
         "location": "DKI Jakarta", "year": 2021, "km_1": 45000, "km_2": 45000}


def test_valid_prediction(client):
    r = client.post("/api/v1/predictions", json=VALID)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["model_version"] == "xgb-v1"
    assert body["predicted_price"] > 0
    assert body["currency"] == "IDR"
    assert body["explanation"]["base_value"] > 0
    assert len(body["explanation"]["features"]) == 6


def test_prediction_roundtrip(client):
    pid = client.post("/api/v1/predictions", json=VALID).json()["prediction_id"]
    r = client.get(f"/api/v1/predictions/{pid}")
    assert r.status_code == 200
    assert r.json()["prediction_id"] == pid


def test_invalid_numeric(client):
    assert client.post("/api/v1/predictions", json={**VALID, "year": 1800}).status_code == 422
    assert client.post("/api/v1/predictions", json={**VALID, "km_1": -5, "km_2": None}).status_code == 422
    assert client.post("/api/v1/predictions", json={**VALID, "km_1": None, "km_2": None}).status_code == 422


def test_invalid_type_and_unknown_category(client):
    assert client.post("/api/v1/predictions", json={**VALID, "brand": 123}).status_code == 422
    r = client.post("/api/v1/predictions", json={**VALID, "brand": "MerkTidakAda"})
    assert r.status_code == 200


def test_active_model(client):
    r = client.get("/api/v1/models/active")
    assert r.status_code == 200
    assert r.json()["model_version"] == "xgb-v1"
    assert "test" in r.json()["metrics"]
