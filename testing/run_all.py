#!/usr/bin/env python3
"""Master Test Orchestrator for OtoValue.
Executes all 5 test suites sequentially and outputs a consolidated test report.
"""
import subprocess
import sys
import time
from pathlib import Path

TESTING_DIR = Path(__file__).resolve().parent

SUITES = [
    ("1. Data Validation", TESTING_DIR / "1_data_validation.py"),
    ("2. Unit Testing", TESTING_DIR / "2_unit_testing.py"),
    ("3. Integration Testing", TESTING_DIR / "3_integration_testing.py"),
    ("4. Functional Testing", TESTING_DIR / "4_functional_testing.py"),
    ("5. Model & XAI Validation", TESTING_DIR / "5_model_xai_validation.py"),
]

def main():
    print("=" * 70)
    print("       OTOVALUE END-TO-END TEST SUITE RUNNER")
    print("=" * 70)
    start_total = time.time()
    results = []

    for name, script_path in SUITES:
        print(f"\n>>> MENJALANKAN SUITE: {name} ...")
        t0 = time.time()
        res = subprocess.run([sys.executable, str(script_path)], capture_output=False)
        duration = time.time() - t0
        passed = (res.returncode == 0)
        results.append((name, passed, duration))
        if not passed:
            print(f"!!! GAGAL pada {name} (returncode {res.returncode})")

    print("\n" + "=" * 70)
    print("                 RINGKASAN HASIL PENGUJIAN")
    print("=" * 70)
    all_passed = True
    for name, passed, duration in results:
        status_str = "PASS" if passed else "FAIL"
        if not passed:
            all_passed = False
        print(f"  {name:<32} [{status_str}]  ({duration:.2f}s)")

    print("-" * 70)
    total_duration = time.time() - start_total
    final_verdict = "GO (ALL PASS)" if all_passed else "NO-GO (FAILURES DETECTED)"
    print(f"Total Waktu  : {total_duration:.2f} detik")
    print(f"Status Akhir : {final_verdict}")
    print("=" * 70)

    if not all_passed:
        sys.exit(1)

if __name__ == "__main__":
    main()
