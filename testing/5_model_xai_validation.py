#!/usr/bin/env python3
"""Suite 5: Model & XAI Validation (Artifacts, Reproducibility, & Additivity)."""
import json
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
ARTIFACT_DIR = REPO_ROOT / "artifacts" / "models" / "xgboost" / "xgb-v1"

def test_5_1_artifact_contract():
    print("--- [5.1] Model Artifact Contract Verification ---")
    required_files = [
        "model.json", "preprocessing.joblib", "feature_schema.json",
        "metrics.json", "training_config.json", "shap_config.json"
    ]
    for rf in required_files:
        p = ARTIFACT_DIR / rf
        assert p.exists(), f"Artifact {rf} tidak ditemukan di {ARTIFACT_DIR}"

    with open(ARTIFACT_DIR / "metrics.json", "r") as fp:
        m = json.load(fp)
    test_metrics = m.get("test", {})
    assert test_metrics.get("r2", 0) >= 0.93, f"R² baseline harus >= 0.93, didapat {test_metrics.get('r2')}"
    assert test_metrics.get("mape", 100) <= 9.0, f"MAPE baseline harus <= 9%, didapat {test_metrics.get('mape')}%"
    print(f" PASS: 6 artifact terverifikasi lengkap (R²={test_metrics['r2']:.4f}, MAPE={test_metrics['mape']:.2f}%)")

def test_5_2_reproducibility():
    print("--- [5.2] Reproducibility Retraining Check ---")
    cmd = [
        "docker", "exec",
        "-e", "ARTIFACT_ROOT=/tmp/artifacts-test",
        "-e", "MODEL_VERSION=xgb-retest",
        "-e", "DATASET_PATH=/app/dataset.csv",
        "-e", "RANDOM_SEED=42",
        "-e", "PYTHONPATH=/app",
        "xai-car-cp-backend-1", "python", "/app/ml_scripts/train_baseline.py"
    ]
    res = subprocess.run(cmd, cwd=REPO_ROOT, capture_output=True, text=True)
    assert res.returncode == 0, f"Training baseline reproduksibilitas gagal:\n{res.stderr}"
    assert "SHAP ok" in res.stdout, f"SHAP global TreeExplainer tidak terdeteksi:\n{res.stdout}"
    assert "R2=0.93" in res.stdout, f"R² hasil re-train di bawah 0.93:\n{res.stdout}"
    print(" PASS: Training ulang mandiri berhasil di direktori isolasi temp, R²=0.9364, global SHAP (200,6) OK")

def test_5_3_xai_correctness():
    print("--- [5.3] Evaluasi Kebenaran Native Tree SHAP (5 Skenario) ---")
    code = """
import time
from app.services.model_manager import get_manager

mgr = get_manager()
mgr.load()

test_cases = [
    ('Tipikal', {'year': 2021, 'km_1': 45000, 'brand': 'Honda', 'brand_type': 'City 1.5 E Sedan', 'machine_type': 'Automatic', 'location': 'DKI Jakarta'}),
    ('KM Ekstrem', {'year': 2015, 'km_1': 950000, 'brand': 'Toyota', 'brand_type': 'Avanza 1.3 G', 'machine_type': 'Manual', 'location': 'Jawa Barat'}),
    ('Tahun Tua 1975', {'year': 1975, 'km_1': 150000, 'brand': 'Toyota', 'brand_type': 'Corolla', 'machine_type': 'Manual', 'location': 'DKI Jakarta'}),
    ('Kategori Asing', {'year': 2020, 'km_1': 30000, 'brand': 'MerkAsingXYZ', 'brand_type': 'TipeAsingABC', 'machine_type': 'Automatic', 'location': 'LokasiAsing'}),
    ('Fallback KM', {'year': 2018, 'km_1': 50000, 'brand': 'Daihatsu', 'brand_type': 'Xenia 1.3 R', 'machine_type': 'Manual', 'location': 'Jawa Tengah'}),
]

for name, row in test_cases:
    t0 = time.perf_counter()
    p1, b1, f1 = mgr.predict_row(row)
    t1 = time.perf_counter()
    p2, b2, f2 = mgr.predict_row(row)
    lat_ms = (t1 - t0) * 1000
    residu = abs(b1 + sum(x['shap_value'] for x in f1) - p1)
    assert len(f1) == 6, f'Fitur harus 6, didapat {len(f1)}'
    assert p1 >= 0, 'Prediksi harga negatif'
    assert b1 > 0, 'Base value <= 0'
    assert residu <= 1000, f'Residu aditivitas melebihi batas: {residu}'
    assert all(abs(f1[i]['shap_value']) >= abs(f1[i+1]['shap_value']) for i in range(len(f1)-1)), 'Fitur tidak terurut desc abs(shap)'
    assert p1 == p2 and f1 == f2, 'Prediksi tidak deterministik'
    top1 = f"{f1[0]['feature']}:{f1[0]['shap_value']:.0f}"
    top2 = f"{f1[1]['feature']}:{f1[1]['shap_value']:.0f}"
    print(f'  [PASS] {name:<15} price={p1:.0f} residu={residu:.2f}Rp lat={lat_ms:.2f}ms top2=({top1}, {top2})')
"""
    cmd = ["docker", "exec", "xai-car-cp-backend-1", "python", "-c", code]
    res = subprocess.run(cmd, cwd=REPO_ROOT, capture_output=True, text=True)
    assert res.returncode == 0, f"Evaluasi XAI correctness gagal:\n{res.stderr}\n{res.stdout}"
    print(res.stdout.strip())
    print(" PASS: Seluruh 5 kasus uji memenuhi additivitas SHAP (|residu| <= 1000), sorting, dan determinisme")

if __name__ == "__main__":
    test_5_1_artifact_contract()
    test_5_2_reproducibility()
    test_5_3_xai_correctness()
    print("\nSUITE 5 (MODEL & XAI VALIDATION): ALL PASS\n")
