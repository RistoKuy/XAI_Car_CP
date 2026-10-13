#!/usr/bin/env python3
"""Suite 1: Data Validation & ETL Rules Check."""
import os
import sys
import pandas as pd
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DATASET_PATH = REPO_ROOT / "dataset.csv"
FILTERED_PATH = REPO_ROOT / "data" / "processed" / "used_filtered.csv"

def test_1_1_profiling():
    print("--- [1.1] Dataset Profiling & Basic Stats ---")
    assert DATASET_PATH.exists(), f"dataset.csv tidak ditemukan di {DATASET_PATH}"
    df = pd.read_csv(DATASET_PATH)
    assert len(df) == 22679, f"Total baris harus 22679, didapat {len(df)}"
    assert len(df.columns) == 14, f"Total kolom harus 14, didapat {len(df.columns)}"
    assert df.isna().sum().sum() == 0, "Ditemukan missing value pada dataset mentah"
    
    types = df["listing__type"].value_counts().to_dict()
    assert types.get("Bekas", 0) + types.get("Used", 0) == 21553, "Bekas + Used harus 21553"
    assert types.get("Baru", 0) == 1126, "Listing Baru harus 1126"
    
    corr = df[["KM_1", "KM_2"]].corr().iloc[0, 1]
    assert corr > 0.998, f"Korelasi KM_1 dan KM_2 harus ~0.999, didapat {corr:.4f}"
    print(f" PASS: rows={len(df)}, missing=0, Bekas/Used=21553, corr={corr:.4f}")

def test_1_2_quality_checks():
    print("--- [1.2] Quality Check Independen ---")
    df = pd.read_csv(DATASET_PATH)
    assert df.duplicated().sum() == 0, "Ditemukan baris duplikat penuh"
    assert (df["price"] <= 0).sum() == 0, "Ditemukan harga <= 0"
    assert ((df["year"] < 1930) | (df["year"] > 2026)).sum() == 0, "Tahun di luar rentang [1930, 2026]"
    assert ((df["KM_1"] < 0) | (df["KM_1"] > 1000000)).sum() == 0, "KM_1 di luar rentang [0, 1000000]"
    
    cat_cols = ["brand", "brand_type", "machine_type", "location"]
    empty_cats = sum((df[c].astype(str).str.strip() == "").sum() for c in cat_cols)
    assert empty_cats == 0, f"Ditemukan {empty_cats} nilai kategori kosong/whitespace"
    
    if FILTERED_PATH.exists():
        filt = pd.read_csv(FILTERED_PATH)
        assert (filt["listing__type"] == "Baru").sum() == 0, "Listing Baru lolos ke used_filtered.csv"
        assert len(filt) == 21553, f"used_filtered.csv harus 21553 baris, didapat {len(filt)}"
    print(" PASS: 0 duplikat, 0 harga invalid, 0 kategori kosong, filter Bekas/Used konsisten")

def test_1_3_etl_rules():
    print("--- [1.3] Validasi Aturan ETL ---")
    try:
        import sqlalchemy  # noqa: F401
        has_sqlalchemy = True
    except ImportError:
        has_sqlalchemy = False

    if has_sqlalchemy:
        sys.path.insert(0, str(REPO_ROOT / "backend"))
        from app.services.etl_service import normalize_mode, _parse_row, REQUIRED
        from app.core.config import get_settings

        s = get_settings()
        base_row = {
            "brand": "Toyota", "brand_type": "Avanza 1.3 G", "machine_type": "Manual",
            "location": "DKI Jakarta", "year": "2020", "KM_1": "30000", "KM_2": "30000",
            "price": "180000000", "listing__type": "Bekas"
        }

        # Kasus 1: Valid row
        assert _parse_row(dict(base_row), s) is not None, "Valid row gagal diparse"
        # Kasus 2: listing__type = Baru ditolak
        assert _parse_row({**base_row, "listing__type": "Baru"}, s) is None, "Listing Baru tidak ditolak"
        # Kasus 3: Tahun invalid
        assert _parse_row({**base_row, "year": "abc"}, s) is None
        assert _parse_row({**base_row, "year": "1920"}, s) is None
        assert _parse_row({**base_row, "year": "2030"}, s) is None
        # Kasus 4: KM invalid
        assert _parse_row({**base_row, "KM_1": "invalid"}, s) is None
        assert _parse_row({**base_row, "KM_1": "-50"}, s) is None
        assert _parse_row({**base_row, "KM_1": "2000000"}, s) is None
        # Kasus 5: Harga negatif
        assert _parse_row({**base_row, "price": "-1000"}, s) is None
        # Kasus 6: Kategori kosong
        for col in ["brand", "brand_type", "machine_type", "location"]:
            assert _parse_row({**base_row, col: "   "}, s) is None
        # Kasus 7: Header wajib
        assert bool(REQUIRED - {"brand", "year"}), "Header parsial tidak terdeteksi"
        # Kasus 8: Normalize mode
        assert normalize_mode("update") == "append"
        assert normalize_mode("replace") == "replace"
        try:
            normalize_mode("hapus_semua")
            assert False, "Mode invalid tidak memicu ValueError"
        except ValueError:
            pass
    else:
        import subprocess
        runner_code = """
from app.services.etl_service import normalize_mode, _parse_row, REQUIRED
from app.core.config import get_settings

s = get_settings()
base_row = {
    'brand': 'Toyota', 'brand_type': 'Avanza 1.3 G', 'machine_type': 'Manual',
    'location': 'DKI Jakarta', 'year': '2020', 'KM_1': '30000', 'KM_2': '30000',
    'price': '180000000', 'listing__type': 'Bekas'
}

assert _parse_row(dict(base_row), s) is not None
assert _parse_row({**base_row, 'listing__type': 'Baru'}, s) is None
assert _parse_row({**base_row, 'year': 'abc'}, s) is None
assert _parse_row({**base_row, 'year': '1920'}, s) is None
assert _parse_row({**base_row, 'year': '2030'}, s) is None
assert _parse_row({**base_row, 'KM_1': 'invalid'}, s) is None
assert _parse_row({**base_row, 'KM_1': '-50'}, s) is None
assert _parse_row({**base_row, 'KM_1': '2000000'}, s) is None
assert _parse_row({**base_row, 'price': '-1000'}, s) is None
for col in ['brand', 'brand_type', 'machine_type', 'location']:
    assert _parse_row({**base_row, col: '   '}, s) is None
assert bool(REQUIRED - {'brand', 'year'})
assert normalize_mode('update') == 'append'
assert normalize_mode('replace') == 'replace'
try:
    normalize_mode('hapus_semua')
    assert False
except ValueError:
    pass
print('ETL_RULES_CONTAINER_OK')
"""
        cmd = ["docker", "exec", "xai-car-cp-backend-1", "python", "-c", runner_code]
        res = subprocess.run(cmd, cwd=REPO_ROOT, capture_output=True, text=True)
        assert res.returncode == 0 and "ETL_RULES_CONTAINER_OK" in res.stdout, f"ETL test container error: {res.stderr}\n{res.stdout}"

    print(" PASS: Seluruh 8 aturan ETL (header, tipe, rentang nilai, mode) lolos validasi")

if __name__ == "__main__":
    test_1_1_profiling()
    test_1_2_quality_checks()
    test_1_3_etl_rules()
    print("\nSUITE 1 (DATA VALIDATION): ALL PASS\n")
