#!/usr/bin/env python3
"""Suite 2: Unit Testing, Static Verification, & Utilities."""
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

def test_2_1_backend_pytest():
    print("--- [2.1] Backend Pytest Suite ---")
    cmd = ["docker", "exec", "-w", "/app", "xai-car-cp-backend-1", "python", "-m", "pytest", "tests", "-q"]
    res = subprocess.run(cmd, cwd=REPO_ROOT, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"STDOUT:\n{res.stdout}\nSTDERR:\n{res.stderr}")
        raise RuntimeError("Pytest backend gagal!")
    assert "17 passed" in res.stdout, f"Hasil tidak mencakup '17 passed': {res.stdout}"
    print(" PASS: 17 unit test backend lulus isolasi (SQLite)")

def test_2_2_static_verification():
    print("--- [2.2] Verifikasi Statis & Bytecode ---")
    compile_cmd = [sys.executable, "-m", "compileall", "-q", str(REPO_ROOT / "backend" / "app"), str(REPO_ROOT / "ml" / "scripts")]
    res_compile = subprocess.run(compile_cmd, capture_output=True, text=True)
    assert res_compile.returncode == 0, f"Compile error:\n{res_compile.stderr}"

    diff_cmd = ["git", "diff", "--check"]
    res_diff = subprocess.run(diff_cmd, cwd=REPO_ROOT, capture_output=True, text=True)
    assert res_diff.returncode == 0, f"Git diff check gagal:\n{res_diff.stdout}"
    print(" PASS: python compileall bersih & git diff --check bebas whitespace error")

def test_2_3_format_currency_node():
    print("--- [2.3] formatCurrency JavaScript Utility ---")
    js_test = """
    import('./frontend/src/utils/formatCurrency.js').then(m => {
        if (!m.formatIDR(0).includes('0')) process.exit(1);
        if (!m.formatIDR(150000000).includes('150')) process.exit(1);
        if (!m.formatSignedIDR(-5000).includes('5.000')) process.exit(1);
        if (!m.formatShortIDR(250000000).includes('250')) process.exit(1);
        process.exit(0);
    }).catch(err => {
        console.error(err);
        process.exit(1);
    });
    """
    cmd = ["node", "-e", js_test]
    res = subprocess.run(cmd, cwd=REPO_ROOT, capture_output=True, text=True)
    assert res.returncode == 0, f"Node formatCurrency assert gagal: {res.stderr}"
    print(" PASS: formatCurrency.js (formatIDR, formatSignedIDR, formatShortIDR) lolos")

if __name__ == "__main__":
    test_2_1_backend_pytest()
    test_2_2_static_verification()
    test_2_3_format_currency_node()
    print("\nSUITE 2 (UNIT TESTING): ALL PASS\n")
