# Agent Execution Rules & Documentation Router

> **Project:** OtoValue: Implementasi dan Evaluasi Sistem Prediksi Harga Mobil Bekas

## Ponytail Execution Mode: ULTRA
- **YAGNI / Zero Bloat**: Delete, omit, or simplify unused code/abstractions. Build the absolute minimum working logic.
- **Native / Stdlib First**: Use standard Python/TypeScript and native platform capabilities instead of introducing third-party packages beyond the agreed stack (FastAPI, XGBoost, SHAP, pandas, NumPy, scikit-learn, SQLAlchemy, Pydantic, ReactJS).
- **One-Liner Bias**: Favor direct, flat logic over multi-layer abstractions and redundant boilerplate.
- **Clean Inline Documentation Rule**: Do NOT write unnecessary meta-comments. Keep inline documentation simple, clean, direct, and focused strictly on describing what the code does.
- **Universal Zero Hardcoding & Environment Config Rule**: NEVER hardcode API URLs, database URLs, port numbers, secret keys, hostnames, model paths, or model versions in source code. All external endpoints, secrets, and system parameters MUST be configured dynamically via environment variables (`.env`, with `.env.example` committed).
- **No Emojis in Frontend Rule**: Never use emoji characters in UI components, buttons, badges, or headers. Use clean inline SVG icons, typography badges, or simple text labels instead.
- **Strict User Permission for Git Commit Rule**: NEVER execute `git commit` or commit code changes without explicit user request or prior user approval.
- **Comprehensive Commit Description Rule**: Every git commit message MUST include a clear, descriptive subject line followed by a comprehensive, detailed multi-line commit body explaining all specific code updates, files modified, and underlying architectural rationale.
- **Continuous Documentation Synchronization Rule**: ALWAYS update and synchronize all project documentation (specifically [README.md](README.md) and [AGENTS.md](AGENTS.md)) whenever code, architecture, schemas, endpoints, or configurations change. Never leave documentation stale or lagging behind implementation.
- **Documentation Centralization Rule**: ALL documentation MUST be centralized in [README.md](README.md) and [AGENTS.md](AGENTS.md). NEVER create fragmented `README.md` files inside subdirectories (`testing/`, `backend/`, `frontend/`, `ml/`, `infra/`). Subdirectory docs are forbidden except a 3-line pointer to the main README section. Before creating any `.md` file, extend the relevant README section instead.

---

## 🎯 Primary Project Goals (Scope CP — Consolidated Technical Blueprint)
CP adalah **proof-of-concept end-to-end** yang harus mendemonstrasikan:

1. **Prediksi Harga Mobil Bekas**: Model XGBoost memprediksi `price` dari karakteristik kendaraan (`brand`, `brand_type`, `machine_type`, `year`, `km_1`, `km_2`, `location`).
2. **Interpretasi Prediksi (SHAP)**: SHAP global dan local explanation menjelaskan kontribusi tiap faktor terhadap prediksi.

Deliverable end-to-end (§1): dataset + metadata model di PostgreSQL, preprocessing reproducible, training XGBoost, evaluasi MAE/RMSE/MAPE/R², SHAP global/local, REST API prediksi + explanation, ReactJS dashboard sederhana, seluruh stack containerized dengan Docker.

---

## Mandatory Pre-Task Rule for AI Agents
> [!IMPORTANT]
> **ALWAYS READ GIT HISTORY & PROJECT DOCUMENTATION BEFORE WRITING CODE OR CREATING SCHEMAS**
>
> 1. Run `git log -n 10 --oneline` (or view commit history) to inspect recent changes.
> 2. Read this `AGENTS.md` to understand the technical blueprint (architecture, API spec, ERD, milestones).
> 3. Inspect [dataset.csv](dataset.csv) before introducing new features, preprocessing rules, or data structures.

---

## Mandatory Documentation Update Rule for AI Agents
> [!IMPORTANT]
> **ALWAYS KEEP ALL DOCUMENTATION SYNCHRONIZED & UP-TO-DATE WITH CODE CHANGES**
>
> Setiap kali ada penambahan fitur, refaktor arsitektur, modifikasi API/skema/database, perubahan konfigurasi, atau alur kerja apa pun:
> 1. AI Agent **WAJIB** segera memperbarui seluruh dokumentasi terkait, terutama [README.md](README.md) dan [AGENTS.md](AGENTS.md), pada siklus/turn yang sama.
> 2. Pastikan penjelasan arsitektur, daftar endpoint, diagram alur, konfigurasi environment, dan spesifikasi teknis selalu akurat dan mencerminkan kode aktual.
> 3. Dokumentasi tidak boleh dibiarkan usang (*stale*), tertinggal, atau tidak sinkron dengan codebase.
> 4. Dokumentasi **WAJIB** tersentralisasi di [README.md](README.md) dan [AGENTS.md](AGENTS.md). DILARANG membuat `README.md` fragmentaris di subdirektori (`testing/`, `backend/`, `frontend/`, `ml/`, `infra/`). Setiap panduan baru wajib menjadi seksi di README utama, bukan file `.md` baru.

---

## Project Documentation Router

| Documentation File | Purpose & Contents |
| --- | --- |
| [dataset.csv](dataset.csv) | **Raw Dataset**: 22.679 rows, 14 columns, target `price`; categorical `brand`, `brand_type`, `machine_type`, `location`, `listing__type`; numeric `year`, `KM_1`, `KM_2`; text `item`, `ellipsize`, `listing__excerpt`; tanpa missing value; dataset sekunder hasil scraping portal Mobil123 (2025) dari [aliabdurrahman10/Used-Car-Analysis-in-Indonesia](https://github.com/aliabdurrahman10/Used-Car-Analysis-in-Indonesia). |
| [testing/](testing/) (`run_all.py` + `1_data_validation.py` s.d. `5_model_xai_validation.py`, panduan di [README Fase 5](README.md#fase-5-integrasi-dan-pengujian)) | **Testing Suite Modular**: 5 skrip flat tanpa subdirektori. Metode, hasil, dan matriks XAI WAJIB terpusat di README Fase 5 — file laporan terpisah dilarang. |

---

## Architecture Contract (Wajib Dipertahankan)

### Single source of truth untuk ML pipeline
Preprocessing yang digunakan saat training HARUS sama dengan preprocessing saat inference:
```text
Training:   Raw → Preprocessing → XGBoost
Inference:  User Input → Preprocessing yang sama → XGBoost
```

### Model versioning (mini model registry — §9 `MODEL_VERSION`)
Setiap prediksi harus dapat menjawab: "Model versi berapa yang menghasilkan prediksi ini?" — simpan `model_version` pada `PREDICTION` melalui relasi ke `MODEL_VERSION`.

### Explainability sebagai bagian dari inference (§7)
Kontribusi fitur bukan analisis offline terpisah. Native XGBoost tree contributions berjalan dalam request flow:
```text
Input → Prediction → Explanation → UI
```
Kontribusi dihitung di backend dengan `Booster.predict(pred_contribs=True)` agar model tidak dikirim ke browser.

### API-first architecture (§4, §23)
Frontend tidak boleh menjalankan model secara langsung. Semua inference hanya di backend FastAPI:
```text
ReactJS → Nginx → FastAPI → Prediction/SHAP Service → Preprocessing → XGBoost
```
Route handler tidak boleh mengakses database langsung — gunakan service/repository layer.

### API Contract (base URL `/api/v1` — §15)
- `GET  /health` — `{"status": "ok", "model_version": "xgb-v1"}`
- `POST /predictions` — request `{brand, brand_type, machine_type, location, year, km_1, km_2}`; response `{prediction_id, model_version, predicted_price, currency: "IDR", explanation: {base_value, features: [{feature, value, shap_value}]}}`
- `GET  /models/active` — metadata model aktif
- `GET  /predictions/{prediction_id}` — detail input + prediction + model version + explanation

Request `POST /predictions` memakai field lowercase `km_1`, `km_2` (API) yang dipetakan ke kolom dataset `KM_1`, `KM_2`.

### Stack yang Disepakati (jangan menyimpang tanpa persetujuan user — §3)
| Layer | Technology |
|---|---|
| Frontend | ReactJS (fetch/Axios) |
| Backend | FastAPI + Pydantic |
| ML | XGBoost native categorical + pandas + NumPy + scikit-learn |
| Database | PostgreSQL + SQLAlchemy |
| Testing | Pytest (backend), frontend manual/E2E |
| Deployment | Docker + Docker Compose + Nginx (reverse proxy) |
| Artifact | `.joblib` / `.json` model + preprocessing pipeline |
| Config | `.env` |

---

## Rule Implementasi Kunci

- **Dataset filter (§2)**: Eksperimen utama HANYA menggunakan listing `Bekas` dan `Used`. Listing `Baru` tidak digunakan (target penelitian adalah mobil bekas). `Unnamed: 0` diperlakukan sebagai index, bukan feature.
- **Kilometer representation (§2)**: `KM_1` dan `KM_2` dianalisis untuk menghindari redundancy — pilih SATU representasi utama setelah analisis korelasi.
- **Excluded baseline features (§2)**: Kolom teks mentah (`item`, `ellipsize`, `listing__excerpt`) tidak digunakan pada baseline pertama untuk menjaga scope dan mencegah leakage.
- **Native categorical pipeline (§2)**: `brand_type` adalah high-cardinality categorical (2.002 nilai) — pertahankan sebagai `pandas.Categorical` dan gunakan `enable_categorical=True`; jangan gunakan One-Hot atau Ordinal Encoding.
- **Model Manager**: Model dan categorical preprocessor di-load sekali saat service start — JANGAN reload pada setiap request.
- **Model artifact**: Mount sebagai read-only volume; backend hanya membaca. Simpan `model_version` + metadata metrics di database.
- **Reproducibility (§16)**: Setiap training run wajib menyimpan random seed, feature list, categorical feature configuration, hyperparameters, dataset version, dan metrics — terikat pada `model_version` yang sama.
- **Model artifact convention (§17)**: per versi di `artifacts/models/xgboost/<version>/` — `model.json`, `preprocessing.joblib`, `feature_schema.json`, `metrics.json`, `training_config.json`, `shap_config.json`.
- **Validation bounds (§18)**: `1930 <= year <= current_allowed_limit`, `0 <= km_1/km_2 <= reasonable_upper_bound`, output `price >= 0`. Bounds final disesuaikan dengan distribusi data, bukan hardcode tanpa dasar. Wajib juga: CORS eksplisit, error handling terstruktur, connection pooling, timeout inference, health endpoint.
- **DB schema (ERD §9)**: 6 tabel — `DATASET`, `ETL_JOB`, `LISTING`, `MODEL_VERSION`, `MODEL_METRIC` (per split), `PREDICTION` (`input_payload` + `shap_payload` sebagai JSONB). PostgreSQL tidak diekspos ke public network.
- **Repo structure (§21)**: `frontend/`, `backend/app/{api,core,db,ml,repositories,schemas,services}`, `testing/{run_all.py,1_data_validation.py,2_unit_testing.py,3_integration_testing.py,4_functional_testing.py,5_model_xai_validation.py}` (flat, tanpa subdirektori), `ml/{notebooks,scripts,experiments}`, `data/{raw,processed}`, `artifacts/models/`, `infra/nginx/`, `docker-compose.yml`, `.env.example`.
- **Implementation order (§22)**: Jangan memulai dari frontend. Phase 1 — Data & ML Baseline (freeze model + preprocessing), Phase 2 — Backend API, Phase 3 — Frontend, Phase 4 — Containerization.
- **No auto-retraining**: Retraining hanya sebagai offline/manual workflow (§8 training script). Tidak ada concept-drift detection dalam scope.
- **ETL upload**: CSV divalidasi dan diproses streaming dengan batch insert; persistent staging file belum digunakan.
- **Out of scope (§1)**: multi-model benchmarking (RF/LightGBM), LIME, MLOps auto-retraining, concept/data drift, MCDM/rekomendasi, real-time scraping, authentication/authorization kompleks.

---

## Frontend Rules (§6)
- Struktur: `components/` (VehicleForm, PredictionCard, ShapWaterfall, ShapBarChart, LoadingState), `pages/` (Home, Prediction), `services/api.js`, `hooks/usePrediction.js`, `utils/formatCurrency.js`.
- ReactJS hanya presentation layer; semua inference via REST ke FastAPI.
- Tanpa emoji di UI; gunakan inline SVG icons atau text labels.
- UI menyebut hasil sebagai **estimasi/model prediction**, bukan harga transaksi pasti.
- Empty/loading/error state informatif (sebab + aksi berikutnya); form kosong tidak diisi data palsu.
- Semua angka/data berasal dari API; responsive dan keyboard-only friendly.

---

## Methodology & Testing Requirements (§19)

Metode baku (detail perintah di [README Fase 5](README.md#fase-5-integrasi-dan-pengujian), skrip di `testing/run_all.py` + `1_data_validation.py` s.d. `5_model_xai_validation.py`):

- **Pre-task wajib**: `git log -n 10 --oneline`, `git status --short`, `git diff --check`; baca `AGENTS.md` + `README.md` + `.env.example` + header `dataset.csv`. Jangan timpa `artifacts/.../xgb-v1/` (retrain uji ke `ARTIFACT_ROOT` temp).
- **Data Validation** (`testing/1_data_validation.py`): `profile_dataset.py` -> `rows=22679`, 14 kolom, `missing=0`, `Bekas+Used=21553`, korelasi `KM_1-KM_2 ~0.999`; quality check duplikat/batas/teks-baseline; aturan tolak ETL (`etl_service.py:11-55`) untuk header hilang, `Baru`, year/km/price/kategori/mode invalid.
- **Backend unit test (Pytest, SQLite)**: `cd backend && python -m pytest tests -q` -> `17 passed`; preprocessing (`pd.Categorical`, asing -> `pd.NA`), prediction service (fallback `km_1 ?? km_2`, `max(0,round)`, log best-effort), SHAP service (`predict_row` 6 fitur sort `abs(shap)`), repository roundtrip, schema validation (422/extra-forbid); plus `compileall` + `git diff --check` bersih dan `formatCurrency.js`.
- **API test**: `GET /health` (200/`xgb-v1`, 503 bila model down), valid prediction request (200, 6 fitur, `IDR`), invalid categorical input (asing -> 200 missing-category), invalid numeric input (422), model unavailable scenario, ETL upload update/replace vs 400, `GET /predictions/{id}` roundtrip, `models/active`, `developer/overview`, `stats/dataset`.
- **Frontend test**: `npm run build` dua entry terisolasi, 0 emoji, tanpa hardcode; form validation, loading state, error state, prediction rendering, SHAP chart rendering; UC1-UC12; responsif 768px; keyboard-friendly; WCAG AA.
- **Integration test**: React → Nginx → FastAPI → XGBoost → SHAP → PostgreSQL; Docker E2E (`compose config/up/ps` + curl health/predict/overview); isolasi `:80` vs `127.0.0.1:8081`; `model_version` tertelusur ke baris `predictions` (JSONB).
- **Model & XAI gate**: 6 file artifact; baseline `MAE=25446042, RMSE=52997228.34, MAPE=8.397%, R2=0.9371, n_test=4311`; retrain seed 42 -> `R2>=0.93, MAPE<=9%`; additivitas `|base+sum(shap)-price|<=Rp1.000`; latensi < `INFERENCE_TIMEOUT_S`; 5 skenario (tipikal/km-ekstrem/tahun-tua/asing/fallback).
- **Hasil resmi 13 Okt 2026 (commit `e96a380`)**: 6/6 PASS, 0 FAIL, 0 SKIPPED — Data (0 null/duplikat, 8 kasus ETL), Unit (`17 passed` 1.29s), Integration (isolasi port terkonfirmasi), Functional (build 1.37s, 0 emoji, UC1-UC12), XAI (retrain `R2=0.9364, MAPE=8.19%`, residu maks Rp116, latensi maks 14.5 ms). Verdict: **GO**.
- **Acceptance criteria (§20)**: dataset tervalidasi, preprocessing jalan tanpa manual intervention, XGBoost terlatih & tersimpan sebagai artifact, prediction pada test set, MAE/RMSE/MAPE/R² terhitung, SHAP global + local dibuat, endpoint prediction berjalan, ReactJS mengirim input & menampilkan predicted price + SHAP explanation, PostgreSQL menyimpan dataset metadata + prediction log, semua service jalan dengan `docker compose up`, `model_version` dapat ditelusuri dari prediction response.

---

# Consolidated Technical Blueprint

Bagian ini adalah sumber kebenaran teknis CP; blueprint sebelumnya sudah
digabungkan ke file ini dan tidak lagi dipelihara sebagai dokumen terpisah.

## Scope and Actors

OtoValue adalah proof-of-concept end-to-end untuk prediksi harga mobil bekas
dengan XGBoost dan explainability native. Dua aktor yang didukung:

- **User Umum**: input kendaraan, menerima estimasi harga, membaca kontribusi fitur, dan melihat statistik dataset.
- **Developer**: melihat overview, upload dataset, menjalankan ETL, melihat model/metrik, menguji playground, dan membuka Swagger.

Di luar scope: benchmarking multi-model, LIME, auto-retraining, drift detection,
rekomendasi MCDM, scraping real-time, authentication kompleks, auto-deploy model,
dan eksekusi arbitrary code dari portal.

## Dataset Decisions

Dataset awal berisi 22.679 baris dan 14 kolom dengan target `price` (dataset sekunder hasil scraping portal Mobil123 tahun 2025 dari repositori [aliabdurrahman10/Used-Car-Analysis-in-Indonesia](https://github.com/aliabdurrahman10/Used-Car-Analysis-in-Indonesia)). Eksperimen
utama hanya memakai listing `Bekas` dan `Used` sebanyak 21.553 baris. `Unnamed: 0`
adalah index, `KM_1` dipakai sebagai representasi kilometer utama karena `KM_1`
dan `KM_2` redundan, dan kolom teks mentah tidak dipakai untuk baseline.

Fitur model adalah `year`, `km_1`, `brand`, `brand_type`, `machine_type`, dan
`location`. Empat fitur kategorikal diproses sebagai `pandas.Categorical` oleh
`CategoricalPreprocessor`; model memakai `XGBRegressor(enable_categorical=True)`.
Kategori yang tidak dikenal saat inference dipetakan ke missing category.

## Architecture

```text
User Portal :80 (index.html)        Developer Portal :8081 (developer.html, loopback-only)
        |                                       |
        +-------------------+-------------------+
                            | (HTTP /api/*)
                            v
                      Nginx Reverse Proxy
        +-------------------+-------------------+
        | Port 80 (Publik)  | Port 8081 (127.0.0.1)
        | Blokir dev.html   | Blokir index.html + Swagger UI /docs
        +-------------------+-------------------+
                            | :8000
                            v
                   FastAPI Lifespan Manager
        (ModelManager warmup + DB table sync + seed auto-check)
                            |
           +----------------+----------------+
           | Pydantic Schema Validation      |
           +----------------+----------------+
                            |
           +----------------+----------------+
           | Domain & Application Services   |
           | - ModelManager (Singleton cache)|
           | - PredictionService             |
           | - ETLService (Streaming batch)  |
           | - StatsService (Aggregations)   |
           +----------------+----------------+
                   |                 |
                   v                 v
+-------------------------+   +------------------------------------+
| ML & Inference Engine   |   | Data Persistence & Repositories    |
| - CategoricalPreprocessor|  | - ListingRepository                |
| - XGBoost Booster       |   | - ModelRepository                  |
| - Tree SHAP Contribs    |   | - PredictionRepository (JSONB logs)|
|   (pred_contribs=True)  |   | - SQLAlchemy ORM 2.0               |
+-------------------------+   | - PostgreSQL 16 Private Container  |
                              +------------------------------------+
```

### Modular Codebase Layers & Component Boundaries

1. **Frontend Presentation Layer (`frontend/src/`)**:
   - **Dual-SPA Multi-Page Build**: Dikonfigurasi pada `vite.config.js` dengan dua entry point terisolasi: `index.html` (`src/main.jsx`) untuk User Portal dan `developer.html` (`src/developer/main.jsx`) untuk Developer Portal. Bundle developer di-*chunk* terpisah (`developer-*.js`) agar tidak bocor ke user publik.
   - **Adaptive UI Shells**: Hook `useWindowSize` mengelola pergantian adaptif antara `DesktopView` (sidebar statis) dan `MobileView` (header hamburger + bottom bar) pada breakpoint 768px. Developer Portal menggunakan `DeveloperShell` dengan navigasi samping dan badge DEV.
   - **Reusable Component Tree**: Komponen formulir dan visualisasi XAI (`VehicleForm`, `PredictionCard`, `ShapWaterfall`, `ShapBarChart`, `LoadingState`) digunakan bersama di User Portal dan Developer Playground.
   - **Analytics & Visualizations**: `DataDashboard.jsx` menyajikan distribusi metrik database (ringkasan, histogram harga, transmisi, ranking merek/lokasi, histogram tahun) via SVG murni tanpa library grafik pihak ketiga.
   - **Client Services & Hooks**: `services/api.js` (Axios/fetch wrapper dengan error/timeout handling), `hooks/usePrediction.js` (state machine inferensi), dan `utils/formatCurrency.js`.

2. **Ingress & Security Layer (`infra/nginx/`)**:
   - **Dual-Port Isolation**: Port 80 melayani User Portal dan mem-proxy `/api/` ke backend; memblokir `developer.html` dan aset developer dengan HTTP 404.
   - **Loopback Developer Port**: Port 8081 di-bind ke `127.0.0.1` melayani Developer Portal, mem-proxy `/api/`, serta membuka Swagger UI (`/docs`, `/openapi.json`); memblokir `index.html`.

3. **API & Web Gateway Layer (`backend/app/api/`, `backend/app/schemas/`)**:
   - **Lifespan Initialization (`backend/app/main.py`)**: Startup memuat tabel via SQLAlchemy, memanaskan model aktif di `ModelManager`, dan mengeksekusi seed otomatis (metadata/listings) bila aktif.
   - **Modular Route Handlers**:
     - `routes_health.py`: Probe liveness/readiness (`GET /health`).
     - `routes_prediction.py`: Eksekusi prediksi + XAI (`POST /predictions`) dan audit log (`GET /predictions/{id}`).
     - `routes_model.py`: Metadata model aktif (`GET /models/active`) dan katalog versi model (`GET /models`).
     - `routes_dataset.py`: Streaming CSV upload (`POST /datasets/upload`) dan metadata (`GET /datasets`, `GET /datasets/{id}`).
     - `routes_etl.py`: Riwayat pekerjaan ETL (`GET /etl/jobs`).
     - `routes_developer.py`: Agregasi diagnostik sistem untuk Developer Overview (`GET /developer/overview`).
     - `routes_stats.py`: Statistik listing terfilter (`GET /stats/dataset`).
   - **Schema Boundary**: Validasi request dan serialisasi response via Pydantic model (`prediction.py`, `model.py`, `stats.py`) dengan batas rentang nilai data yang ketat.

4. **Domain & Service Layer (`backend/app/services/`)**:
   - **`ModelManager` (`model_manager.py`)**: Singleton in-memory model cache yang memuat artefak XGBoost dan preprocessor sekali saat startup, menghilangkan overhead disk I/O per request.
   - **`PredictionService` (`prediction_service.py`)**: Mengorkestrasi normalisasi input (fallback `km_1`/`km_2`), transformasi kategorikal, eksekusi Booster XGBoost, ekstraksi SHAP aditif native, agregasi kembali ke 6 fitur semantik, dan pencatatan audit log ke database secara best-effort.
   - **`ETLService` (`etl_service.py`)**: Parser streaming CSV multipart berbasis chunk tanpa menimbun seluruh file di RAM; validasi skema, pembersihan nilai, filter listing `Bekas`/`Used`, serta eksekusi mode `update` (append) dan `replace` (truncate + insert).
   - **`StatsService` (`stats_service.py`)**: Menghitung analitik teragregasi database listing untuk keperluan visualisasi dashboard.

5. **Machine Learning & XAI Engine (`backend/app/ml/`, `artifacts/models/`)**:
   - **`CategoricalPreprocessor` (`categorical_preprocessor.py`)**: Mempertahankan tipe `pandas.Categorical` asli untuk high-cardinality `brand_type` (> 2.000 kategori). Menghindari One-Hot Encoding berlebih dan distorsi ordinal encoding. Memetakan kategori asing saat inference ke *missing category* yang didukung langsung oleh XGBoost.
   - **In-Engine Tree SHAP**: Dihitung langsung melalui `Booster.predict(..., pred_contribs=True)` dalam request flow backend. Memenuhi jaminan aditivitas ($\text{Base Value} + \sum \phi_i = \text{Prediksi}$) dalam orde milidetik tanpa membutuhkan paket runtime `shap`.
   - **Artifact Contract**: Tersimpan per versi di `artifacts/models/xgboost/<version>/` (`model.json`, `preprocessing.joblib`, `feature_schema.json`, `metrics.json`, `training_config.json`, `shap_config.json`).

6. **Persistence & Repository Layer (`backend/app/repositories/`, `backend/app/db/`)**:
   - **Repository Pattern**: Memisahkan query database dari route/service (`ListingRepository`, `ModelRepository`, `PredictionRepository`).
   - **SQLAlchemy ORM 2.0**: Mengelola koneksi pooling, transaksi, dan model relasional: `Dataset`, `ETLJob`, `Listing`, `ModelVersion`, `ModelMetric`, dan `Prediction` (dengan field `input_payload` dan `shap_payload` berbasis JSONB).
   - **Database Network**: PostgreSQL 16 Alpine berjalan dalam internal Docker bridge network dan tidak diekspos ke host publik.

7. **Offline ML Pipeline & Tooling (`ml/scripts/`)**:
   - `profile_dataset.py`: Profiling dataset mentah `dataset.csv`, verifikasi korelasi `KM_1`/`KM_2`, ekstraksi subset `Bekas`/`Used` (21.553 baris).
   - `train_baseline.py`: Pipeline pelatihan mandiri (seed 42, 80/20 train/test, evaluasi MAE/RMSE/MAPE/R², export 6 file artefak terversi).
   - `seed_db.py`: Skrip mandiri untuk mempopulasikan metadata dan database listing.

## ML and Artifact Contract

```text
Raw CSV -> filter Bekas/Used -> quality check -> train/test split
	-> categorical dtype normalization -> XGBoost native categorical
	-> evaluation -> versioned artifacts
```

Artefak `xgb-v1` terakhir memiliki metrik test:

| MAE | RMSE | MAPE | R² |
|---:|---:|---:|---:|
| 25.446.042 | 52.997.228 | 8,40% | 0,9371 |

Explanation lokal dihitung di backend melalui
`Booster.predict(pred_contribs=True)`, lalu diagregasi kembali ke enam fitur
asli. Library `shap` tidak dibutuhkan pada inference runtime.

Training bersifat offline/manual:

```text
python ml/scripts/profile_dataset.py
python ml/scripts/train_baseline.py
```

Setiap training run menyimpan seed, feature list, categorical feature list,
hyperparameters, dataset reference, metrics, dan model version.

## API Contract

Base URL: `/api/v1`

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/health` | status backend dan model |
| POST | `/predictions` | estimasi + explanation + model version |
| GET | `/predictions/{id}` | detail prediction log |
| GET | `/models/active` | model aktif dan metrik |
| GET | `/models` | seluruh model version |
| POST | `/datasets/upload` | validasi dan ETL CSV multipart |
| GET | `/datasets` | daftar dataset dan ETL job terbaru |
| GET | `/datasets/{id}` | detail dataset dan job |
| GET | `/etl/jobs` | riwayat ETL |
| GET | `/developer/overview` | overview sistem Developer Portal |
| GET | `/stats/dataset` | statistik listing dan histogram |

Request prediction memakai `brand`, `brand_type`, `machine_type`, `location`,
`year`, `km_1`, dan `km_2`. Minimal satu kilometer harus diisi. Output price
tidak boleh negatif. Inference memakai timeout `INFERENCE_TIMEOUT_S` dan
database connection pooling.

## Dataset and ETL Contract

Upload CSV memvalidasi extension, ukuran, UTF-8, header wajib, tipe listing,
batas tahun/kilometer, harga non-negatif, dan field kategorikal tidak kosong.
Data diproses streaming tanpa menyimpan seluruh file sebagai `rows` dan `valid`;
listing ditulis ke database dalam batch. Mode `update` melakukan append, mode
`replace` menghapus listing dataset lalu mengisi data baru. ETL tidak memicu
retraining otomatis.

## Database and Deployment

PostgreSQL menyimpan `datasets`, `etl_jobs`, `listings`, `model_versions`,
`model_metrics`, dan `predictions`. Artifact model di-mount read-only. PostgreSQL
tidak dipublish ke public network. Nginx mempublikasikan User Portal pada port
80 dan Developer Portal hanya melalui `127.0.0.1:${DEVELOPER_PORT:-8081}`.

```text
docker compose up -d --build
User Portal:      http://localhost/
Developer Portal: http://localhost:8081/
Swagger:          http://localhost:8081/docs
pgAdmin:          http://localhost:5050
```

## Testing and Acceptance

Backend test suite mencakup health, prediction, validation, model
metadata, ETL upload update/replace, dataset detail, ETL history, dan overview
(`17 passed`); compile Python dan `git diff --check` wajib lulus. Metode lengkap
di [README Fase 5](README.md#fase-5-integrasi-dan-pengujian); skrip di
`testing/` (`run_all.py` + `1_data_validation.py` s.d. `5_model_xai_validation.py`).

Hasil resmi 13 Okt 2026 (commit `e96a380`): 6/6 kategori PASS, 0 FAIL —
Data (22679 baris, 21553 Bekas/Used, korelasi 0.998979), Unit (17 passed 1.29s),
Integration (isolasi `:80`/`:8081` terkonfirmasi), Functional (build 1.37s,
UC1-UC12), XAI (6 artifact utuh, retrain `R2=0.9364/MAPE=8.19%`, 5 kasus residu
<= Rp116, latensi <= 14.5 ms). Verdict: **GO**.

CP dianggap selesai ketika dataset tervalidasi, pipeline native categorical dapat
melatih model versioned, metrik dan explanation tersedia, endpoint prediction /
dataset / ETL / model berjalan, kedua portal terisolasi, PostgreSQL menyimpan
metadata dan prediction log, serta `docker compose up` menjalankan stack.

## Development Sequence and Extension Point

Urutan kerja: ML baseline dan artifact freeze, dataset/ETL, backend/model
management, Developer Portal, User Portal, lalu containerization dan E2E.
Training tetap offline/manual tanpa endpoint auto-retraining.

Lanjutan TA yang kompatibel: authentication/RBAC, monitoring, scheduled ETL,
CI/CD deployment, Random Forest/LightGBM comparison, LIME, dan analisis
konsistensi explanation.
