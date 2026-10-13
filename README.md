# OtoValue: Implementasi dan Evaluasi Sistem Prediksi Harga Mobil Bekas

Implementasi dan evaluasi model XGBoost untuk prediksi harga mobil bekas dengan
Explainable Artificial Intelligence menggunakan SHAP. Proof-of-concept end-to-end:
dataset dan metadata model di PostgreSQL, preprocessing reproducible, training
XGBoost, evaluasi MAE/RMSE/MAPE/R2, SHAP global/lokal, REST API prediksi +
explanation + dataset/ETL/model management, dua portal ReactJS terisolasi
(User Portal publik + Developer Portal loopback-only), seluruh stack
containerized dengan Docker.

## Daftar isi

1. [Konsep, ruang lingkup, dan aktor](#1-konsep-ruang-lingkup-dan-aktor)
2. [Arsitektur](#2-arsitektur)
3. [Dataset dan keputusan data](#3-dataset-dan-keputusan-data)
4. [Pipeline ML dan artifact model](#4-pipeline-ml-dan-artifact-model)
5. [Backend (FastAPI)](#5-backend-fastapi)
6. [Developer Portal](#6-developer-portal)
7. [User Portal (ReactJS)](#7-user-portal-reactjs)
8. [Database (PostgreSQL + pgAdmin)](#8-database-postgresql--pgadmin)
9. [Konfigurasi dan password](#9-konfigurasi-dan-password)
10. [Deploy dan menjalankan](#10-deploy-dan-menjalankan)
11. [Testing](#11-testing)
12. [Struktur repo](#12-struktur-repo)
13. [Kriteria penerimaan](#13-kriteria-penerimaan)
14. [Keterbatasan dan lanjutan TA](#14-keterbatasan-dan-lanjutan-ta)

## 1. Konsep, ruang lingkup, dan aktor

Setiap prediksi harus bisa menjawab dua pertanyaan: **berapa estimasinya** dan
**mengapa sebesar itu**. Prinsip yang dipegang:

- **Satu pipeline preprocessing** dipakai saat training dan inference. Model tidak
  pernah melihat data mentah.
- **Model versioning**: setiap prediksi menyimpan `model_version`, jadi hasilnya
  selalu bisa ditelusuri ke artifact dan metrik yang menghasilkannya.
- **SHAP sebagai bagian dari inference**, bukan analisis offline. Backend menghitung
  kontribusi tiap fitur di dalam request flow `Input -> Prediction -> Explanation -> UI`,
  agar model tidak pernah dikirim ke browser.
- **API-first**: ReactJS hanya presentation layer. Semua inference lewat FastAPI,
  route handler tidak mengakses database langsung (service/repository layer).
- **Dua portal terpisah, bukan satu aplikasi gabungan**: User Portal untuk publik,
  Developer Portal sebagai konsol teknis di port tersendiri yang hanya di-bind ke
  loopback, sehingga user biasa tidak bisa mengaksesnya via jaringan.

Sistem memiliki tepat dua aktor:

```mermaid
flowchart LR
    U([User Umum])
    D([Developer])

    subgraph SYS[CP Prediction System]
        UC1((Input Data Kendaraan))
        UC2((Hitung Estimasi Harga))
        UC3((Lihat Penjelasan SHAP))
        UC4((Lihat Dashboard Data))
        UC5((Lihat System Overview))
        UC6((Upload Dataset CSV))
        UC7((Pilih Mode Update / Replace))
        UC8((Jalankan ETL + Validasi))
        UC9((Lihat Riwayat ETL))
        UC10((Lihat Model + Metrik))
        UC11((Uji Prediction Playground))
        UC12((Jelajahi API via Swagger))
    end

    U --> UC1
    UC1 -. include .-> UC2
    UC2 -. include .-> UC3
    U --> UC4

    D --> UC5
    D --> UC6
    UC6 -. include .-> UC7
    UC7 -. include .-> UC8
    D --> UC9
    D --> UC10
    D --> UC11
    UC11 -. include .-> UC2
    D --> UC12
```

Di luar scope CP: benchmarking multi-model (RF/LightGBM), LIME, auto-retraining
MLOps, deteksi drift, rekomendasi MCDM, scraping real-time, auth kompleks,
auto-deploy model setelah training, code editor/eksekusi arbitrary code dari portal.

## 2. Arsitektur

### 2.1 Ringkasan Topologi Sistem

```mermaid
flowchart TB
    subgraph Client[Client]
        U[User Umum]
        D[Developer]
        FE[User Portal\nterang]
        DEV[Developer Portal\ngelap + badge DEV]
    end
    subgraph App[Application Layer]
        N80[Nginx :80 publik]
        N8081[Nginx :8081 loopback-only]
        F[FastAPI]
        V[Pydantic Validation]
        S[Prediction Service]
        X[XAI Service]
        DM[Dataset Service]
        ETL[ETL Engine]
        MS[Model Service]
    end
    subgraph ML[ML Layer]
        P[Preprocessing Pipeline]
        M[XGBoost Model]
        SH[SHAP Explainer]
    end
    subgraph Data[Data Layer]
        PG[(PostgreSQL)]
        FS[/Model Artifact Volume/]
    end
    U --> FE
    D --> DEV
    FE --> N80
    DEV --> N8081
    N80 -->|/api/*| F
    N8081 -->|/api/*| F
    F --> V
    F --> S
    F --> X
    F --> DM
    F --> ETL
    F --> MS
    S --> P
    P --> M
    S --> X
    X --> SH
    X --> M
    X --> P
    ETL --> PG
    S --> PG
    X --> PG
    MS --> PG
    MS --> FS
    M --> FS
    P --> FS
    SH --> FS
```

### 2.2 Dekomposisi Arsitektur Codebase (Layered Architecture)

Codebase dirancang dengan arsitektur berlapis (*layered architecture*) yang memisahkan *presentation*, *gateway/routing*, *domain service*, *machine learning engine*, dan *data access*. Seluruh komponen mengikuti prinsip *Single Responsibility* dan minim ketergantungan silang:

```text
+-----------------------------------------------------------------------------------+
| 1. PRESENTATION LAYER (frontend/)                                                 |
|    - Dual SPA Bundle: User Portal (index.html) & Developer Portal (developer.html) |
|    - Adaptive Shells: DesktopView, MobileView (useWindowSize <= 768px), DevShell   |
|    - UI Components: VehicleForm, PredictionCard, ShapWaterfall, DataDashboard      |
|    - State & Client Services: usePrediction hook, api.js, formatCurrency.js       |
+-----------------------------------------------------------------------------------+
                                         |  HTTP / REST
                                         v
+-----------------------------------------------------------------------------------+
| 2. INGRESS & REVERSE PROXY LAYER (infra/nginx/)                                   |
|    - Port 80 (Publik): Serves User SPA + Proxy /api/ -> FastAPI (Blokir dev 404)  |
|    - Port 8081 (127.0.0.1 Loopback): Serves Dev SPA + Swagger /docs + Proxy /api/ |
+-----------------------------------------------------------------------------------+
                                         |  Reverse Proxy :8000
                                         v
+-----------------------------------------------------------------------------------+
| 3. API & WEB GATEWAY LAYER (backend/app/api/, backend/app/schemas/)              |
|    - App Lifespan: ModelManager warming + DB table init + auto-seed metadata      |
|    - Route Handlers: routes_health, routes_prediction, routes_model,              |
|                      routes_dataset, routes_etl, routes_developer, routes_stats   |
|    - Contract Validation: Pydantic schemas (PredictionRequest/Response, Stats)    |
+-----------------------------------------------------------------------------------+
                                         |  Invocations
                                         v
+-----------------------------------------------------------------------------------+
| 4. DOMAIN & SERVICE LAYER (backend/app/services/)                                 |
|    - ModelManager: Singleton in-memory loader untuk XGBoost artifact & preprocessor|
|    - PredictionService: Pipeline orkestrator (Input -> Preprocess -> Predict -> XAI)|
|    - ETLService: Streaming chunk parser CSV, data validator, batch DB ingestion   |
|    - StatsService: Agregasi analitik data listing mobil bekas untuk dashboard     |
+-----------------------------------------------------------------------------------+
                         |                                   |
                         v                                   v
+--------------------------------------+  +-----------------------------------------+
| 5. ML & EXPLAINABILITY (backend/ml/) |  | 6. REPOSITORY & PERSISTENCE (backend/db/|
|    - CategoricalPreprocessor         |  |    backend/app/repositories/)           |
|      (pandas.Categorical native)     |  |    - ListingRepository: bulk query/stats|
|    - Native XGBoost Booster Runtime  |  |    - ModelRepository: versions & metrics|
|    - In-Engine Tree SHAP Explainer   |  |    - PredictionRepository: JSONB audit  |
|      (pred_contribs=True, no SHAP lib|  |    - SQLAlchemy ORM 2.0 Engine          |
|       required at inference runtime) |  |    - PostgreSQL 16 (6 relational tables)|
+--------------------------------------+  +-----------------------------------------+
```

#### 1. Lapisan Frontend (`frontend/`)
- **Dual-SPA Multi-Page Architecture**: Dikonfigurasi melalui `vite.config.js` dengan dua entry point terisolasi: `index.html` (`src/main.jsx`) untuk User Portal dan `developer.html` (`src/developer/main.jsx`) untuk Developer Portal. Kode modul developer di-*chunk* terpisah (`developer-*.js`) sehingga tidak pernah bocor ke dalam bundle publik.
- **Adaptive Shell Switcher**: Hook `useWindowSize` mendeteksi *viewport width* secara reaktif (breakpoint 768px). Pada layar lebar (desktop), antarmuka menggunakan `DesktopView` dengan sidebar tetap. Pada layar kecil (mobile), antarmuka beralih ke `MobileView` dengan hamburger navigation dan *bottom navigation bar*.
- **Reusable Presentation Components**: Komponen visual utama (`VehicleForm`, `PredictionCard`, `ShapWaterfall`, `ShapBarChart`, `LoadingState`) digunakan secara konsisten baik pada User Portal maupun pada Developer Playground (`DevPlayground.jsx`).
- **Data Dashboard Visualizations**: `DataDashboard.jsx` menyajikan distribusi metrik mobil bekas (ringkasan, histogram harga, proporsi transmisi, perbandingan merek dan wilayah, serta histogram tahun) menggunakan visualisasi SVG native tanpa ketergantungan library grafik eksternal.
- **Client Service & State Management**: Modul `services/api.js` membungkus fetch API dengan penanganan timeout, `hooks/usePrediction.js` mengelola state siklus inferensi (idle, loading, success, error), dan `utils/formatCurrency.js` memformat representasi mata uang Rupiah.

#### 2. Lapisan Ingress & Reverse Proxy (`infra/nginx/`)
- **Port 80 (Public Gateway)**: Menyajikan static files User Portal (`index.html`), mem-proxy request rute `/api/` ke container backend (`fastapi:8000`), dan secara eksplisit memblokir request ke `developer.html` atau `/assets/developer*` dengan status HTTP 404.
- **Port 8081 (Loopback Developer Gateway)**: Dibatasi secara ketat hanya pada interface loopback `127.0.0.1`. Menyajikan Developer Portal (`developer.html`), dokumentasi Swagger UI (`/docs`, `/openapi.json`), dan mem-proxy `/api/`. Request ke `index.html` publik diblokir dengan status HTTP 404.

#### 3. Lapisan API & Web Gateway (`backend/app/api/`, `backend/app/schemas/`)
- **Lifespan Lifecycle Controller (`backend/app/main.py`)**: Mengelola inisialisasi aplikasi secara tersentralisasi saat proses startup: memastikan tabel PostgreSQL terbuat via SQLAlchemy, memuat model ML aktif ke memory lewat `ModelManager`, dan mengeksekusi auto-seed metadata dataset/model/listing (bila diaktifkan via `SEED_ON_STARTUP`).
- **Modular Route Handlers**:
  - `routes_health.py`: Healthcheck endpoint (`GET /health`) yang memverifikasi kesiapan model aktif.
  - `routes_prediction.py`: Endpoint inferensi tunggal (`POST /predictions`) dan pembacaan detail riwayat prediksi (`GET /predictions/{id}`).
  - `routes_model.py`: Endpoint informasi model aktif (`GET /models/active`) dan katalog seluruh versi model (`GET /models`).
  - `routes_dataset.py`: Multipart upload streaming dataset CSV (`POST /datasets/upload`) serta metadata dataset (`GET /datasets`, `GET /datasets/{id}`).
  - `routes_etl.py`: Riwayat audit eksekusi ETL (`GET /etl/jobs`).
  - `routes_developer.py`: Agregasi ringkasan diagnostik backend, database, model, dan status ETL (`GET /developer/overview`).
  - `routes_stats.py`: Endpoint metrik statistik agregat listing mobil bekas (`GET /stats/dataset`).
- **Schema Contracts (`backend/app/schemas/`)**: Pydantic models mendefinisikan validasi batas ketat (`1930 <= year <= 2026`, `km >= 0`, `price >= 0`) dan serialisasi JSON terstruktur.

#### 4. Lapisan Domain & Service (`backend/app/services/`)
- **`ModelManager` (`model_manager.py`)**: Singleton in-memory cache untuk artefak model XGBoost. Membaca file `model.json`, `preprocessing.joblib`, dan skema fitur sekali saat startup. Tidak melakukan disk I/O ulang saat melayani request inferensi.
- **`PredictionService` (`prediction_service.py`)**: Mengorkestrasi alur inferensi: memvalidasi fallback kilometer (`km_1` atau `km_2`), mentransformasi input ke format DataFrame berkategori native, memanggil XGBoost Booster untuk memprediksi harga, mengekstrak penjelasan pohon native, memetakan kembali kontribusi ke 6 fitur semantik, dan menyimpan log prediksi ke database secara best-effort tanpa menghambat respons pengguna.
- **`ETLService` (`etl_service.py`)**: Mengimplementasikan pemrosesan streaming batch untuk file CSV multipart tanpa memuat seluruh file ke RAM. Melakukan validasi header wajib, sanitasi batas numerik/kategorikal, pemfilteran listing `Bekas`/`Used`, serta mendukung mode ingestion `update` (append) dan `replace` (pengosongan data lama dataset lalu pengisian baru).
- **`StatsService` (`stats_service.py`)**: Menghitung analitik teragregasi langsung dari tabel listing database (total unit, mean/median/min/max harga, distribusi transmisi, ranking merek, dan sebaran tahunan).

#### 5. Lapisan Machine Learning & XAI (`backend/app/ml/`, `artifacts/models/`)
- **`CategoricalPreprocessor` (`categorical_preprocessor.py`)**: Mempertahankan tipe data kategori asli pandas (`pandas.Categorical`) untuk fitur berkardinalitas tinggi seperti `brand_type` (> 2.000 kategori). Menghindari ledakan dimensi One-Hot Encoding dan distorsi ordinal encoding. Menangani kategori baru saat inferensi dengan memetakannya ke *missing category* yang didukung langsung oleh algoritma pohon XGBoost.
- **Native In-Engine Tree SHAP**: Penjelasan fitur dihitung langsung di backend menggunakan fitur native pohon XGBoost `Booster.predict(..., pred_contribs=True)`. Menghasilkan *base value* dan nilai kontribusi per fitur secara aditif ($\text{Base Value} + \sum \phi_i = \text{Prediksi}$). Kecepatan komputasi berada pada orde milidetik dan tidak membutuhkan library `shap` pada saat runtime inferensi.
- **Versioned Artifact Bundle**: Disimpan per versi pada direktori `artifacts/models/xgboost/<version>/` yang mencakup 6 file lengkap: `model.json` (bobot model), `preprocessing.joblib` (state preprocessor), `feature_schema.json` (definisi fitur dan tipe data), `metrics.json` (skor MAE/RMSE/MAPE/R2 per split), `training_config.json` (parameter training dan random seed), serta `shap_config.json` (konfigurasi atribut explainability).

#### 6. Lapisan Repository & Persistensi Data (`backend/app/repositories/`, `backend/app/db/`)
- **Repository Pattern**: Mengisolasi logika query basis data dari lapisan route dan service:
  - `ListingRepository`: Pengambilan data listing teragregasi, query berfilter, dan operasi *bulk insert* batch.
  - `ModelRepository`: Pengambilan metadata versi model aktif dan metrik evaluasi per split.
  - `PredictionRepository`: Penyimpanan log inferensi dan riwayat prediksi dengan field `input_payload` dan `shap_payload` berbasis JSONB untuk kemudahan audit trail.
- **Database Engine & ORM**: Berbasis SQLAlchemy 2.0 dengan driver `psycopg` (PostgreSQL 16) menggunakan connection pooling dan session lifecycle `get_db()`.
- **Relational ERD Tables**: Terdiri dari 6 tabel: `datasets`, `etl_jobs`, `listings`, `model_versions`, `model_metrics`, dan `predictions`.

#### 7. Pipeline ML Offline & Reproducibility (`ml/scripts/`)
- **`profile_dataset.py`**: Skrip CLI untuk memprofiling dataset mentah `dataset.csv`, menganalisis korelasi redundansi `KM_1` dan `KM_2`, memfilter baris listing `Bekas` dan `Used` (21.553 baris), dan mengekspor dataset bersih ke `data/processed/`.
- **`train_baseline.py`**: Skrip pelatihan reproducible mandiri dengan random seed 42, pembagian 80/20 train/test, pelatihan XGBoost native categorical, evaluasi metrik performa, dan pembuatan paket artefak terversi.
- **`seed_db.py`**: Skrip populasi database independen untuk menginisialisasi metadata model, metrik evaluasi, dan listing data awal ke PostgreSQL.

### 2.3 Alur Eksekusi (Execution Flows)

Alur prediksi + penjelasan:

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as ReactJS
    participant API as FastAPI
    participant VAL as Pydantic
    participant SVC as Prediction Service
    participant PIPE as Preprocessing Pipeline
    participant MODEL as XGBoost Model
    participant XAI as SHAP Service
    participant DB as PostgreSQL
    User->>UI: Isi atribut kendaraan, klik Hitung
    UI->>API: POST /api/v1/predictions
    API->>VAL: Validasi request
    VAL-->>API: Payload tervalidasi
    API->>SVC: predict(payload)
    SVC->>PIPE: transform(payload)
    PIPE-->>SVC: Fitur siap model
    SVC->>MODEL: predict(features)
    MODEL-->>SVC: Estimasi harga
    SVC->>XAI: explain(features)
    XAI-->>SVC: Nilai SHAP per fitur
    SVC->>DB: Simpan prediksi + versi model
    DB-->>SVC: Tersimpan
    SVC-->>API: Prediksi + explanation
    API-->>UI: JSON response
    UI-->>User: Harga + visual SHAP
```

Alur upload dataset + ETL (Developer Portal):

```mermaid
sequenceDiagram
    autonumber
    actor Developer
    participant PORTAL as Developer Portal
    participant API as FastAPI
    participant ETL as ETL Engine
    participant DB as PostgreSQL
    Developer->>PORTAL: Pilih CSV + mode Update/Replace
    PORTAL->>API: POST /api/v1/datasets/upload (multipart)
    API->>ETL: Validasi skema + quality check
    ETL->>ETL: Filter Bekas/Used, transformasi
    ETL->>DB: Append (update) atau hapus-isi (replace)
    DB-->>ETL: ETL job SUCCEEDED + ringkasan
    ETL-->>API: total/valid/ditolak/total di DB
    API-->>PORTAL: Hasil ETL
```

### 2.4 Topologi Deployment & Isolasi Jaringan

Deploy (sesuai `docker-compose.yml`):

```text
User biasa (jaringan)
  |
  v
http://<host>              (nginx :80, publik)
  |-- /        -> User Portal (frontend :80, index.html)
  |-- /api/    -> backend (FastAPI + Uvicorn :8000)
  (developer.html + chunk /assets/developer* diblokir 404 di port ini)

Developer (localhost / SSH tunnel)
  |
  v
http://localhost:8081      (nginx :8081, bind 127.0.0.1 saja)
  |-- /            -> Developer Portal (frontend :8081, developer.html)
  |-- /api/        -> backend (FastAPI :8000)
  |-- /docs        -> Swagger UI
  |-- /openapi.json -> OpenAPI contract

backend -> postgres :5432 (tidak diekspos ke host; volume postgres_data)
backend -> artifact model (bind-mount read-only)
pgAdmin langsung di :5050 (tanpa login, mode passwordless)
```

| Service  | Image / Build        | Akses host                        | Peran                                   |
|----------|----------------------|-----------------------------------|-----------------------------------------|
| nginx    | `nginx:alpine`       | `:80` publik, `:8081` loopback    | Reverse proxy dua port                  |
| frontend | build `./frontend`   | via nginx (`:80`/`:8081` internal)| Dua entry: `index.html` + `developer.html` |
| backend  | build `./backend`    | via nginx                         | FastAPI + XGBoost + SHAP + ETL          |
| postgres | `postgres:16-alpine` | -                                 | Database + metadata + log               |
| pgadmin  | `dpage/pgadmin4:9`   | `:5050`                           | Administrasi database                   |

## 3. Dataset dan keputusan data

`dataset.csv`: 22.679 baris, 14 kolom, target `price`, tanpa missing value.

| Jenis kolom | Kolom |
|---|---|
| Kategorikal | `brand` (51), `brand_type` (2.002), `machine_type`, `location` (22), `listing__type` |
| Numerik | `year` (1975-2025), `KM_1`, `KM_2` |
| Teks mentah | `item`, `ellipsize`, `listing__excerpt` |

Keputusan penelitian (diimplementasikan di `ml/scripts/` dan dipakai ulang oleh
ETL backend):

- Eksperimen utama hanya listing `Bekas` + `Used` (21.553 baris). `Baru` dibuang.
- `Unnamed: 0` = index, bukan fitur.
- `KM_1` dan `KM_2` berkorelasi 0,999 (redundan), dipakai satu: `km_1`.
- Kolom teks mentah tidak dipakai di baseline (scope + cegah leakage).
- `brand_type` high-cardinality dipertahankan sebagai dtype kategori dan diproses oleh
  native categorical XGBoost (`enable_categorical=true`), tanpa One-Hot Encoding,
  Ordinal Encoding, atau target leakage.

Dataset baru masuk **hanya** lewat upload Developer Portal + ETL (validasi skema,
quality check, filter `Bekas`/`Used`), dengan dua mode: **Update** (append, data
lama tetap ada) atau **Replace** (hapus semua data lama, isi data baru).
Batas upload via env `MAX_UPLOAD_MB` (default 50).

## 4. Pipeline ML dan artifact model

```text
Raw CSV -> Filter Used/Bekas -> Quality Check -> Split 80/20 (seed 42)
  -> CategoricalPreprocessor -> XGBoost (enable_categorical=true)
  -> Evaluasi -> Artifact
```

Fitur: `year` dan `km_1` numerik; `brand`, `machine_type`, `location`, dan
`brand_type` dipertahankan sebagai `pandas.Categorical`. Kategori baru saat
inference dipetakan menjadi missing category dan tetap dapat diprediksi oleh
XGBoost native categorical.

Model aktif `xgb-v1` (`artifacts/models/xgboost/xgb-v1/`), metrik test:

| MAE | RMSE | MAPE | R2 |
|---|---|---|---|
| 25.446.042 | 52.997.228 | 8,40% | 0,9371 |

Konvensi artifact per versi (`model.json`, `preprocessing.joblib`,
`feature_schema.json`, `metrics.json`, `training_config.json`, `shap_config.json`):
satu `model_version` mengikat model + preprocessing + skema + metrik + konfigurasi
SHAP, sehingga inference selalu reproducible. Training bersifat offline/manual:

```bash
python ml/scripts/profile_dataset.py   # profiling + filter -> data/processed/
python ml/scripts/train_baseline.py    # latih + evaluasi + simpan artifact
```

Penjelasan lokal memakai kontribusi pohon native XGBoost
(`Booster.predict(pred_contribs=True)`), diagregasi kembali ke 6 fitur asli.
Terverifikasi aditivitasnya: `base_value + sum(shap) = prediksi` (residu Rp88
akibat pembulatan float32). Tidak butuh lib `shap` saat inference.

## 5. Backend (FastAPI)

Base URL `/api/v1`. Model dan preprocessing dimuat **sekali** saat startup
(lifespan), tidak reload per request. Inference dibatasi timeout (`INFERENCE_TIMEOUT_S`,
respons 504 bila lewat). Startup otomatis membuat tabel dan seed metadata
dataset + versi model + metrik. Kode:
`backend/app/{api,core,db,ml,repositories,schemas,services}`.

| Method | Endpoint | Keterangan |
|---|---|---|
| GET | `/health` | `{"status": "ok", "model_version": "xgb-v1"}` (503 bila model belum termuat) |
| POST | `/predictions` | Prediksi + explanation, log ke PostgreSQL (best-effort) |
| GET | `/predictions/{id}` | Detail input + prediksi + explanation |
| GET | `/models/active` | Metadata model aktif + metrik per split |
| GET | `/models` | Daftar seluruh versi model + metrik (Model Management) |
| POST | `/datasets/upload` | Upload CSV multipart (`file` + `mode` update/replace), langsung ETL |
| GET | `/datasets` | Daftar dataset + 5 ETL job terakhir per dataset |
| GET | `/datasets/{id}` | Detail dataset + 20 riwayat ETL |
| GET | `/etl/jobs` | Riwayat ETL job (`?limit`, default 20) |
| GET | `/developer/overview` | Agregat backend + database + dataset/model aktif + ETL readiness |
| GET | `/stats/dataset` | Statistik database listings (total, harga, tahun, km, merek, lokasi, histogram; filter opsional `brand`, `location`, `machine_type`, `year_min`, `year_max`) |

Contoh request prediksi:

```json
{"brand": "Honda", "brand_type": "City 1.5 E Sedan", "machine_type": "Automatic",
 "location": "DKI Jakarta", "year": 2021, "km_1": 45000, "km_2": 45000}
```

Contoh response:

```json
{"prediction_id": "uuid", "model_version": "xgb-v1", "predicted_price": 258148416,
 "currency": "IDR",
 "explanation": {"base_value": 313370208,
   "features": [{"feature": "year", "value": 2021, "shap_value": 25150464}] } }
```

Validasi Pydantic: `1930 <= year <= 2026`, `0 <= km <= 1.000.000` (batas dari
distribusi data, dapat diubah via env `MIN_YEAR`/`MAX_YEAR`/`MAX_KM`), minimal
satu dari `km_1`/`km_2` terisi, kategori asing ditoleransi (tetap memprediksi).
Training tidak diekspos sebagai endpoint (offline via `ml/scripts/`, tanpa
auto-retraining dan tanpa auto-deploy).

## 6. Developer Portal

Konsol teknis di `http://localhost:8081` (loopback-only), entry `developer.html`,
shell gelap + badge DEV, 6 modul dengan navigasi sendiri:

| Modul | Rute | Fungsi |
|---|---|---|
| Business/System Overview | `#/developer` | Status backend, database, dataset/model aktif, ETL readiness |
| Dataset Management | `#/developer/datasets` | Upload CSV + pilihan **Update** (tambah) / **Replace** (ganti semua + warning), daftar dataset |
| ETL Management | `#/developer/etl` | Tabel riwayat job: file, mode, status, total/valid/ditolak |
| Model Management | `#/developer/models` | Versi model, badge ACTIVE, metrik MAE/RMSE/MAPE/R2 per split |
| Prediction Playground | `#/developer/playground` | Uji prediksi + SHAP memakai komponen yang sama dengan User Portal |
| API Explorer | `#/developer/api` | Katalog endpoint + tombol ke Swagger UI (`/docs`, same-origin) |

Isolasi dari user biasa berlapis: port berbeda + bind loopback, entry build
terpisah (bundle user terbukti bersih dari kode developer), nginx memblokir
silang (`developer.html` 404 di port 80, `index.html` 404 di port 8081), tanpa
link dari User Portal ke Developer Portal, dan `noindex, nofollow`.

## 7. User Portal (ReactJS)

Halaman `Beranda` (penjelasan + metrik model live dari API), `Data` (dashboard
statistik database listings: tata letak lebar di desktop dan ringkas di mobile,
ringkasan, histogram harga, perbandingan transmisi, merek dan lokasi berdampingan,
histogram tahun penuh, semuanya dengan tooltip hover/sentuh/fokus dan
scroll-reveal), dan `Hitung estimasi`
(formulir -> kartu hasil -> grafik SHAP). Komponen: `VehicleForm`,
`PredictionCard`, `ShapWaterfall`, `ShapBarChart`, `LoadingState`, plus
`services/api.js`, `hooks/usePrediction.js`, `utils/formatCurrency.js`.

Aturan yang dipegang: styling Tailwind CSS, satu aplikasi dua shell via hook
`useWindowSize` (batas 768px): desktop dengan Sidebar statis, mobile dengan
Hamburger Menu + Bottom Navigation Bar, tanpa emoji (ikon SVG inline), hasil
disebut **estimasi model** bukan harga pasti, opsi dropdown dari dataset asli
(47 merek, 21 lokasi), semua angka dari API, state kosong/loading/error
informatif (sebab + aksi), responsif dan keyboard-only friendly (skip link,
kontrol native, fokus terlihat). API base via `VITE_API_URL`, default
same-origin `/api/v1`. Bundle user tidak memuat rute/navigasi developer.

## 8. Database (PostgreSQL + pgAdmin)

Enam tabel sesuai ERD: `datasets` (metadata + status + counter valid/ditolak),
`etl_jobs` (riwayat eksekusi ETL: mode, file, total/valid/ditolak, status),
`listings` (observasi mobil bekas), `model_versions` (mini model registry, satu
baris aktif), `model_metrics` (metrik per split: test/validation), `predictions`
(`input_payload` + `shap_payload` sebagai JSONB untuk audit trail).

Seed metadata otomatis saat backend start. Tabel `listings` ikut di-seed otomatis
bila kosong dan file CSV tersedia (`SEED_CSV_PATH`, di compose ter-mount dari
`./data/processed`; bila belum ada, fallback ke `SEED_FALLBACK_CSV_PATH` =
`dataset.csv` mentah yang ikut ter-mount di `/app/dataset.csv`). Matikan dengan `SEED_ON_STARTUP=false`. Seed manual
penuh (dataset + listings + model + metrik):

```bash
# Postgres harus dapat dijangkau, mis. port-forward atau DATABASE_URL lokal
set DATABASE_URL=postgresql+psycopg://app@HOST:5432/carprice
python ml/scripts/seed_db.py
```

pgAdmin tanpa login di `http://localhost:5050`, server `carprice (local)` sudah
terdaftar otomatis.

## 9. Konfigurasi dan password

Semua endpoint, secret, dan parameter via environment (`.env`, contoh di
`.env.example`). Tidak ada hardcode port/URL/secret di source code.

**Mode default = passwordless lokal** (cukup `docker compose up`):

- Postgres: `POSTGRES_HOST_AUTH_METHOD=trust`, tanpa password.
- pgAdmin: desktop mode tanpa layar login, server terdaftar via `servers.json`.

Bila butuh password (server bersama/produksi):

1. Isi `POSTGRES_PASSWORD=...` dan `POSTGRES_HOST_AUTH_METHOD=scram-sha-256`.
2. Samakan di `DATABASE_URL=postgresql+psycopg://app:<password>@postgres:5432/carprice`.
3. Kembalikan pgAdmin ke mode login (hapus `PGADMIN_CONFIG_SERVER_MODE`) dan
   daftarkan server manual (host `postgres`, user `app`, password sama).

Variabel utama: `DATABASE_URL`, `POSTGRES_DB/USER/PASSWORD/HOST_AUTH_METHOD`,
`PGADMIN_PORT/DEFAULT_EMAIL`, `MODEL_DIR`, `MODEL_VERSION`,
`CORS_ORIGINS`, `INFERENCE_TIMEOUT_S`, `MAX_UPLOAD_MB`, `DEVELOPER_PORT`,
`RANDOM_SEED`, `DATASET_PATH`, `SEED_ON_STARTUP`, `SEED_CSV_PATH`,
`VITE_API_URL`, `VITE_API_TIMEOUT_MS`, `VITE_USER_PORTAL_URL`.

## 10. Deploy dan menjalankan

Prasyarat: Docker + Docker Compose v2.

```bash
cp .env.example .env          # opsional, default sudah passwordless
docker compose up -d --build  # bangun + jalankan semua service
docker compose ps             # pastikan semua Up/healthy
```

Akses:

| Layanan | URL | Keterangan |
|---|---|---|
| User Portal | http://localhost/ | Publik |
| Hitung estimasi | http://localhost/#/prediksi | Publik |
| Developer Portal | http://localhost:8081/ | Loopback-only (developer) |
| Swagger UI | http://localhost:8081/docs | Via port developer |
| API health | http://localhost/api/v1/health | Publik |
| pgAdmin | http://localhost:5050 | Tanpa login |

Uji cepat end-to-end:

```bash
curl http://localhost/api/v1/health
curl -X POST http://localhost/api/v1/predictions -H "Content-Type: application/json" -d "{\"brand\":\"Honda\",\"brand_type\":\"City 1.5 E Sedan\",\"machine_type\":\"Automatic\",\"location\":\"DKI Jakarta\",\"year\":2021,\"km_1\":45000,\"km_2\":45000}"
curl http://localhost:8081/api/v1/developer/overview
```

Upload dataset via Developer Portal (contoh mode replace):

```bash
curl -X POST http://localhost:8081/api/v1/datasets/upload -F "mode=replace" -F "file=@dataset_baru.csv"
```

Perintah umum: `docker compose logs -f backend`, `docker compose down`,
`docker compose down -v` (hapus juga data postgres dan pgAdmin).

Troubleshooting:

- `backend` restart terus: cek `docker compose logs backend`; pastikan folder
  `artifacts/models/xgboost/xgb-v1/` ada (di-mount read-only).
- `pgadmin` meminta login: pastikan `PGADMIN_CONFIG_SERVER_MODE=False` dan volume
  `servers.json` termount; hapus volume `pgadmin_data` bila config lama tersimpan.
- `postgres` menolak koneksi: tunggu healthcheck (`pg_isready`), cek
  `POSTGRES_HOST_AUTH_METHOD`.
- Developer Portal tidak bisa diakses dari jaringan lain: memang disengaja
  (bind `127.0.0.1`); gunakan SSH tunnel ke server.
- Build backend lama (>10 menit): wajar, instalasi `xgboost` + `shap` (+ lib sains)
  di image `python:3.11-slim`. Package `shap` hanya dibutuhkan workflow
  training/profiling; inference memakai kontribusi native XGBoost.

Pengembangan lokal tanpa Docker: backend `pip install -r backend/requirements.txt`
lalu `uvicorn app.main:app` dari `backend/` (set `DATABASE_URL` sqlite/Postgres
dan `MODEL_DIR` absolut); frontend `npm install && npm run dev` dari `frontend/`
(proxy `/api` ke `localhost:8000`, kedua entry ter-serve oleh Vite dev server).

## 11. Testing

- Phase 1: `profile_dataset.py` (filter 21.553 baris, korelasi 0,999) dan
  `train_baseline.py` (native categorical XGBoost, metrik di atas, artifact 6 file).
- Phase 2: `cd backend && python -m pytest tests -q` (17 passed: health,
  prediksi valid, roundtrip GET, 422 numerik invalid, 422 tipe salah + 200
  kategori asing, models/active + metrik, upload update/replace, validasi skema,
  mode/tipe file invalid, ETL jobs, dataset detail, models list, developer
  overview).
- Phase 3: `npm run build` (dua entry `index.html` + `developer.html`; bundle
  user terverifikasi bersih dari kode developer), unit `formatCurrency`, smoke
  API + `vite preview`, cek bundle (tanpa hardcode/emoji/em dash), kontras WCAG
  AA, Delivery Gate Antislop.
- Phase 4: `docker compose config` + build semua image + uji e2e di atas
  (React -> Nginx -> FastAPI -> XGBoost -> SHAP -> PostgreSQL, plus alur
  Developer Portal -> ETL -> PostgreSQL dan Swagger -> OpenAPI -> FastAPI).

## 12. Struktur repo

```text
frontend/                  # ReactJS, dua entry: index.html (user) + developer.html
  src/
    layouts/               # DesktopView/MobileView (user) + DeveloperShell
    developer/             # devNav.js + main.jsx (entry developer)
    components/            # prediction (dipakai ulang playground), nav, shell user
    pages/                 # Home/Prediction/DataDashboard + developer/ (6 modul)
    services/hooks/utils/  # api.js, usePrediction.js, formatCurrency.js
  nginx.conf               # dua server: :80 user, :8081 developer (+ blokir silang)
backend/                   # FastAPI (app/api, core, db, repositories, schemas, services)
  app/api/                 # routes_health/prediction/model/dataset/etl/developer/stats
  app/services/            # prediction_service, model_manager, stats_service, etl_service
ml/scripts/                # profile_dataset, train_baseline, seed_db
data/processed/            # hasil filter (regenerable, di-ignore git)
artifacts/models/          # artifact versioned xgb-v1
infra/nginx/               # reverse proxy dua port (80 publik + 8081 loopback)
infra/pgadmin/             # servers.json praregistrasi
docker-compose.yml
.env.example
```

Urutan implementasi: Phase 1 data/ML -> Phase 2 dataset/ETL -> Phase 3 backend +
model management -> Phase 4 Developer Portal -> Phase 5 User Dashboard ->
Phase 6 containerization. Tanpa auto-retraining (offline/manual saja).

## 13. Kriteria penerimaan

- [x] Dataset dimuat dan divalidasi (21.553 Bekas/Used, 0 missing).
- [x] Preprocessing reproducible (satu pipeline train = inference).
- [x] XGBoost terlatih sebagai artifact versioned (`xgb-v1`).
- [x] Prediksi di test set + MAE/RMSE/MAPE/R2 terhitung.
- [x] SHAP lokal per prediksi (aditivitas terverifikasi; global mengikuti dari artifact + metrik).
- [x] Endpoint prediksi + explanation berjalan.
- [x] Endpoint dataset/ETL berjalan (upload Update/Replace, validasi skema, filter Bekas/Used).
- [x] Endpoint model metadata berjalan (active + list + metrik).
- [x] Endpoint developer overview berjalan.
- [x] ReactJS User Portal kirim input, tampilkan harga + SHAP.
- [x] Developer Portal 6 modul (overview, datasets, ETL, models, playground, API explorer).
- [x] Developer Portal terisolasi di port loopback, bundle user bersih dari kode developer.
- [x] PostgreSQL simpan metadata dataset/model, riwayat ETL, + log prediksi.
- [x] `docker compose up` menjalankan semua service.
- [x] `model_version` tertelusur dari respons prediksi.

## 14. Keterbatasan dan lanjutan TA

Keterbatasan CP: baseline satu model, lib `shap` tidak bisa build di Python 3.13
lokal (diverifikasi di image 3.11; inference memakai kontribusi native XGBoost), training
offline/manual tanpa endpoint, tanpa auth/drift-monitoring. Isolasi Developer
Portal mengandalkan bind loopback + split entry (tanpa login); auth penuh
ditunda ke TA.

Lanjutan TA yang disiapkan arsitektur: tambah `Authentication + User Management +
Dashboard analytics + Model monitoring` di sisi aplikatif; `Random Forest +
LightGBM + LIME + uji konsistensi explanation` di sisi riset. Service backend
tetap, perubahan di layer eksperimen dan model registry.
