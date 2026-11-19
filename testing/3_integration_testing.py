#!/usr/bin/env python3
"""Suite 3: Integration Testing (REST API, Multipart ETL, & Nginx Isolation)."""
import json
import urllib.error
import urllib.request

def get_json(url):
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
        return resp.status, json.loads(resp.read().decode())

def post_json(url, payload):
    body = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        return resp.status, json.loads(resp.read().decode())

def test_3_1_api_endpoints():
    print("--- [3.1] REST API Endpoints Verification ---")
    s, h = get_json("http://localhost/api/v1/health")
    assert s == 200 and h.get("status") == "ok", f"Healthcheck gagal: {h}"

    payload = {
        "brand": "Honda", "brand_type": "City 1.5 E Sedan", "machine_type": "Automatic",
        "location": "DKI Jakarta", "year": 2021, "km_1": 45000, "km_2": 45000
    }
    s, pred = post_json("http://localhost/api/v1/predictions", payload)
    assert s == 200 and pred["predicted_price"] > 0, f"Prediksi gagal: {pred}"
    assert len(pred["explanation"]["features"]) == 6, "Fitur penjelasan SHAP harus berjumlah 6"
    assert pred["model_version"] == "xgb-v1", "Model version tidak sesuai"

    pred_id = pred["prediction_id"]
    try:
        get_json(f"http://localhost/api/v1/predictions/{pred_id}")
    except urllib.error.HTTPError as e:
        assert e.code == 404, f"Detail prediksi publik harus 404, didapat {e.code}"
    else:
        raise AssertionError("Detail prediksi tidak boleh tersedia di port publik")
    s, get_pred = get_json(f"http://localhost:8081/api/v1/predictions/{pred_id}")
    assert s == 200 and get_pred["prediction_id"] == pred_id, "Pengambilan riwayat prediksi via port developer gagal"

    s, active = get_json("http://localhost/api/v1/models/active")
    assert s == 200 and active.get("model_version") == "xgb-v1", "Metadata active model gagal"

    s, overview = get_json("http://localhost:8081/api/v1/developer/overview")
    assert s == 200 and overview.get("backend", {}).get("status") == "ok", "Developer overview gagal"

    s, stats = get_json("http://localhost/api/v1/stats/dataset")
    assert s == 200 and stats.get("total", 0) > 0, "Dataset stats gagal"

    print(" PASS: Public prediction/detail API boundaries, active model, developer overview, and stats")

def test_3_2_multipart_etl_upload():
    print("--- [3.2] Multipart CSV ETL Upload & Error Handling ---")
    boundary = "----TestBoundaryOtoValueIntegration"
    def upload(filename, content, mode, base_url="http://localhost:8081"):
        body = (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="mode"\r\n\r\n'
            f"{mode}\r\n"
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
            f"Content-Type: text/csv\r\n\r\n"
            f"{content}\r\n"
            f"--{boundary}--\r\n"
        ).encode()
        req = urllib.request.Request(
            f"{base_url}/api/v1/datasets/upload",
            data=body,
            headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
        )
        try:
            with urllib.request.urlopen(req) as resp:
                return resp.status, json.loads(resp.read().decode())
        except urllib.error.HTTPError as e:
            return e.code, e.read().decode()

    csv_valid = (
        "brand,brand_type,machine_type,location,year,KM_1,KM_2,price,listing__type\n"
        "Honda,City 1.5 E Sedan,Automatic,DKI Jakarta,2021,45000,45000,215000000,Bekas\n"
        "Toyota,Avanza 1.3 G,Manual,Jawa Barat,2019,60000,60000,165000000,Used"
    )

    s_bad_mode, _ = upload("test.csv", csv_valid, "mode_rusak")
    assert s_bad_mode == 400, f"Mode rusak harus 400, didapat {s_bad_mode}"

    s_bad_head, _ = upload("test.csv", "brand,price\nHonda,100", "update")
    assert s_bad_head == 400, f"Header rusak harus 400, didapat {s_bad_head}"

    s_public, _ = upload("test.csv", csv_valid, "update", base_url="http://localhost")
    assert s_public == 404, f"Upload dataset via port publik harus 404, didapat {s_public}"

    csv_all_baru = "brand,brand_type,machine_type,location,year,KM_1,KM_2,price,listing__type\nHonda,City,Automatic,Jakarta,2021,10,10,200,Baru"
    s_baru, _ = upload("test.csv", csv_all_baru, "update")
    assert s_baru == 400, f"CSV tanpa Bekas/Used harus 400, didapat {s_baru}"

    s_up, res_up = upload("test.csv", csv_valid, "update")
    assert s_up == 200 and isinstance(res_up, dict) and res_up.get("valid_rows") == 2, f"Upload update valid gagal: {res_up}"
    print(" PASS: Upload publik ditolak; upload developer dan validasi ETL berjalan")

def test_3_3_nginx_port_isolation():
    print("--- [3.3] Nginx Dual-Port Security Boundary Isolation ---")
    def fetch_status(url):
        try:
            with urllib.request.urlopen(url) as resp:
                return resp.status
        except urllib.error.HTTPError as e:
            return e.code

    # Port 80 (Publik)
    assert fetch_status("http://localhost/") == 200, "Port 80 harus melayani index.html publik"
    assert fetch_status("http://localhost/developer.html") == 404, "Port 80 HARUS memblokir developer.html (404)"
    assert fetch_status("http://localhost/assets/developer.js") == 404, "Port 80 HARUS memblokir aset developer (404)"

    admin_api_paths = (
        "/api/v1/datasets",
        "/api/v1/datasets/upload",
        "/api/v1/etl/jobs",
        "/api/v1/developer/overview",
        "/api/v1/models",
    )
    for path in admin_api_paths:
        assert fetch_status(f"http://localhost{path}") == 404, f"Port 80 HARUS memblokir {path} (404)"

    # Port 8081 (Loopback Developer)
    assert fetch_status("http://localhost:8081/") == 200, "Port 8081 harus melayani developer.html"
    assert fetch_status("http://localhost:8081/index.html") == 404, "Port 8081 HARUS memblokir index.html (404)"
    assert fetch_status("http://localhost:8081/docs") == 200, "Port 8081 harus mengekspos Swagger UI (/docs)"
    for path in admin_api_paths:
        if path.endswith("/upload"):
            continue
        assert fetch_status(f"http://localhost:8081{path}") == 200, f"Port 8081 harus mengizinkan {path}"

    print(" PASS: Port 80 memblokir UI dan API developer; port 8081 mengizinkan fungsi developer")

if __name__ == "__main__":
    test_3_1_api_endpoints()
    test_3_2_multipart_etl_upload()
    test_3_3_nginx_port_isolation()
    print("\nSUITE 3 (INTEGRATION TESTING): ALL PASS\n")
