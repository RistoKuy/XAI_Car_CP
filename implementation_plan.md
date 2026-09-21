# Implementation Plan — CP

## Explainable AI untuk Prediksi Harga Mobil Bekas berbasis Web

**Judul CP:**

> AutoValue: Implementasi dan Evaluasi Sistem Prediksi Harga Mobil Bekas

**Tech Stack utama:**

* Frontend: ReactJS
* Backend/API: FastAPI (Python)
* ML: XGBoost + SHAP + scikit-learn
* Database: PostgreSQL
* ORM: SQLAlchemy
* Validation: Pydantic
* Containerization: Docker + Docker Compose
* Reverse Proxy: Nginx (production/deployment)

\---

# 1\. Scope CP

CP difokuskan pada pembangunan **proof-of-concept end-to-end** yang dapat:

1. Menerima dataset baru melalui Developer Portal.
2. Menjalankan ETL pipeline sebelum dataset masuk ke database.
3. Memvalidasi dan membuat versi dataset yang telah disetujui.
4. Menyimpan dataset terkurasi, metadata dataset, metadata model, dan prediction logs di PostgreSQL.
5. Menyediakan preprocessing pipeline yang reproducible.
6. Melatih model XGBoost untuk prediksi `price` berdasarkan dataset terpilih.
7. Mengevaluasi model menggunakan MAE, RMSE, MAPE, dan R².
8. Menghasilkan SHAP global dan local explanation.
9. Menyediakan REST API untuk prediction, explanation, dataset management, ETL, dan model metadata.
10. Menyediakan ReactJS User Dashboard sederhana untuk demonstrasi prediction + explanation.
11. Menyediakan **Developer Portal** sebagai control/testing console untuk overview sistem, dataset management, ETL, model overview, prediction playground, dan API Explorer berbasis OpenAPI/Swagger.
12. Menjalankan seluruh stack secara containerized menggunakan Docker.

CP **belum** mencakup:

* multi-model benchmarking RF/XGBoost/LightGBM;
* LIME;
* MLOps auto-retraining;
* concept/data drift;
* sistem rekomendasi MCDM;
* real-time scraping;
* authentication/authorization kompleks;
* automatic model deployment setelah training;
* code editor atau eksekusi arbitrary code dari Developer Portal.

## Use Case Diagram — Dua Aktor

Sistem memiliki tepat dua aktor: **User Umum** (publik, via port 80) dan
**Developer** (teknis, via port loopback 8081). Tidak ada aktor lain;
ETL, training, dan evaluasi adalah proses internal yang dipicu oleh Developer,
bukan aktor mandiri.

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

### Tujuan tiap aktor

| Aktor | Use cases | Portal |
|-|-|-|
| User Umum | Input data kendaraan, hitung estimasi, lihat penjelasan SHAP, lihat dashboard data | User Portal (`:80`, `#/`, `#/data`, `#/prediksi`) |
| Developer | System overview, upload dataset + mode Update/Replace, ETL + validasi, riwayat ETL, model + metrik, playground, API explorer | Developer Portal (`:8081` loopback, `#/developer/...`) |

Catatan batasan:

* Developer menguji prediksi lewat **Prediction Playground**, bukan lewat User Portal.
* User Umum tidak memiliki use case dataset/ETL/model — seluruh fungsi teknis
  hanya ada di Developer Portal yang terisolasi di port loopback.
* Training model adalah aktivitas offline/manual developer (`ml/scripts`),
  bukan use case portal (tanpa auto-retraining, tanpa auto-deploy).

# 2\. Dataset Context

Dataset awal yang dianalisis:

* 22.679 rows
* 14 columns
* target: `price`
* categorical: `brand`, `brand\\\_type`, `machine\\\_type`, `location`, `listing\\\_\\\_type`
* numeric: `year`, `KM\\\_1`, `KM\\\_2`
* text: `item`, `ellipsize`, `listing\\\_\\\_excerpt`
* tidak terdapat missing value pada snapshot dataset saat ini

Keputusan CP:

* Eksperimen utama menggunakan listing `Bekas` dan `Used`.
* Listing `Baru` tidak digunakan pada eksperimen utama karena target penelitian adalah mobil bekas.
* `Unnamed: 0` diperlakukan sebagai index, bukan feature.
* `KM\\\_1` dan `KM\\\_2` dianalisis untuk menghindari redundancy.
* Kolom teks mentah tidak digunakan pada baseline pertama untuk menjaga scope dan mencegah leakage.
* `brand\\\_type` adalah high-cardinality categorical feature dan encoding harus dilakukan di dalam pipeline agar tidak terjadi target leakage.

\---

# 3\. High-Level Tech Stack

|Layer|Technology|Responsibility|
|-|-|-|
|User UI|ReactJS|Vehicle input, prediction page, SHAP visualization|
|Developer Portal|ReactJS + OpenAPI/Swagger UI|System overview, dataset management, ETL control, model overview, prediction playground, API testing|
|HTTP|Axios/fetch|Frontend → FastAPI|
|API|FastAPI|REST endpoint, validation, orchestration|
|Schema|Pydantic|Request/response validation|
|Business Logic|Python service layer|Prediction, explanation, dataset, ETL, and model operations|
|ETL|Python + pandas/scikit-learn utilities|Extract, validate, transform, filter, and publish dataset versions|
|ML|XGBoost|Price regression|
|Explainability|SHAP|Global/local explanation|
|ML utilities|scikit-learn|Preprocessing, split, metrics, pipeline|
|ORM|SQLAlchemy|PostgreSQL access|
|DB|PostgreSQL|Curated listings, dataset versions, model metadata, metrics, prediction logs|
|Artifact Storage|Docker Volume / filesystem|Model, preprocessing, feature schema, SHAP configuration|
|Container|Docker|Packaging application services|
|Orchestration|Docker Compose|Local/CP deployment|
|Reverse Proxy|Nginx|Serve frontend and route `/api`|
|Config|`.env`|Environment-specific configuration|

# 4\. System Architecture Diagram

```mermaid
flowchart TB
    subgraph Browser[Client]
        U[User]
        D[Developer]
        FE[ReactJS User Dashboard]
        DEV[ReactJS Developer Portal]
    end

    subgraph App[Application Layer]
        N[Nginx]
        F[FastAPI]
        V[Pydantic Validation]
        S[Prediction Service]
        X[XAI Service]
        DM[Dataset Management Service]
        ETL[ETL Engine]
        MS[Model Service]
    end

    subgraph ML[ML Layer]
        P[Preprocessing Pipeline]
        M[XGBoost Model]
        SH[SHAP Explainer]
        TR[Training Pipeline]
        EV[Evaluation]
    end

    subgraph Data[Data Layer]
        STG[/Staging File Volume/]
        PG[(PostgreSQL)]
        FS[/Versioned Model Artifacts/]
    end

    subgraph API[Developer API Tooling]
        O[OpenAPI Specification]
        SW[Swagger UI / API Explorer]
    end

    U --> FE
    D --> DEV

    FE --> N
    DEV --> N
    N -->|/api/*| F

    F --> V
    F --> S
    F --> X
    F --> DM
    F --> ETL
    F --> MS

    DEV --> SW
    F --> O
    O --> SW

    S --> P
    P --> M
    S --> X
    X --> SH
    X --> M
    X --> P

    DM --> STG
    STG --> ETL
    ETL --> PG

    PG --> TR
    TR --> P
    TR --> M
    TR --> EV
    TR --> SH

    M --> FS
    P --> FS
    SH --> FS
    MS --> FS
    MS --> PG

    S --> PG
    X --> PG
```

### Architecture Notes

* ReactJS digunakan untuk dua surface: **User Dashboard** dan **Developer Portal**.
* FastAPI menjadi single entry point untuk business/API operations.
* OpenAPI menjadi API contract tunggal; Swagger UI digunakan sebagai API Explorer di Developer Portal sehingga API tidak perlu didefinisikan ulang.
* Developer Portal berfungsi sebagai **control/testing console**, bukan code editor dan bukan arbitrary-code execution environment.
* Dataset yang di-upload masuk ke staging terlebih dahulu dan **tidak langsung dipublish ke tabel utama**.
* ETL Engine melakukan schema validation, data quality checks, filtering `Bekas`/`Used`, feature transformation, dan dataset versioning sebelum data dipersist ke PostgreSQL.
* PostgreSQL menyimpan curated dataset, dataset metadata/version, model metadata, metrics, dan prediction logs.
* Model, preprocessing, feature schema, dan SHAP configuration tetap disimpan sebagai versioned artifacts pada mounted volume/filesystem, bukan sebagai blob utama di database.
* Prediction service dan XAI service menggunakan model artifact aktif; database digunakan untuk metadata dan audit/history.
* SHAP dijalankan di backend agar model tidak dikirim ke browser.
* Nginx menjadi reverse proxy pada deployment gabungan.

# 5\. Backend Component Structure

```text
backend/
├── app/
│   ├── main.py
│   ├── api/
│   │   ├── routes\\\_health.py
│   │   ├── routes\\\_prediction.py
│   │   ├── routes\\\_model.py
│   │   └── routes\\\_dataset.py
│   ├── core/
│   │   ├── config.py
│   │   └── logging.py
│   ├── schemas/
│   │   ├── prediction.py
│   │   └── model.py
│   ├── services/
│   │   ├── prediction\\\_service.py
│   │   ├── explanation\\\_service.py
│   │   └── model\\\_service.py
│   ├── repositories/
│   │   ├── listing\\\_repository.py
│   │   ├── prediction\\\_repository.py
│   │   └── model\\\_repository.py
│   ├── ml/
│   │   ├── preprocessing.py
│   │   ├── etl.py
│   │   ├── train.py
│   │   ├── predict.py
│   │   └── explain.py
│   └── db/
│       ├── session.py
│       └── models.py
├── artifacts/
│   ├── model/
│   ├── preprocessing/
│   └── shap/
├── tests/
└── requirements.txt
```

### Separation of concerns

* `api/`: HTTP contract.
* `schemas/`: input/output schema.
* `services/`: business logic.
* `repositories/`: persistence access.
* `ml/`: preprocessing, training, prediction, SHAP.
* `db/`: SQLAlchemy models and session management.
* `artifacts/`: versioned model-related files.

\---

# 6\. Frontend Component Structure — Dua Portal Terpisah

User Portal dan Developer Portal adalah **dua portal terpisah** dalam satu SPA:
bukan satu navigasi gabungan dan bukan sekadar satu page tambahan.
Pemisahan bersifat visual (shell terang vs shell gelap + badge DEV),
routing (namespace `#/developer/...`), dan navigasi (6 modul khusus developer).

```text
Developer Portal
├── Business/System Overview
├── Dataset Management
├── ETL Management
├── Model Management
├── Prediction Playground
└── API Explorer
    └── Swagger/OpenAPI
```

```text
frontend/
├── src/
│   ├── layouts/
│   │   ├── DesktopView.jsx        # User Portal shell desktop (>=768px)
│   │   ├── MobileView.jsx         # User Portal shell mobile (<768px)
│   │   └── DeveloperShell.jsx     # Developer Portal shell (gelap + badge DEV)
│   ├── developer/
│   │   └── devNav.js              # 6 item navigasi + parser rute #/developer/...
│   ├── components/
│   │   ├── prediction/            # dipakai ulang User Portal + Playground
│   │   │   ├── VehicleForm.jsx
│   │   │   ├── PredictionCard.jsx
│   │   │   ├── ShapWaterfall.jsx
│   │   │   ├── ShapBarChart.jsx
│   │   │   └── LoadingState.jsx
│   │   ├── navItems.jsx           # hanya Beranda/Data/Estimasi (tanpa Developer)
│   │   ├── PageContent.jsx        # hanya rute user
│   │   ├── DesktopView.jsx
│   │   └── MobileView.jsx
│   ├── pages/
│   │   ├── Home.jsx               # User Portal
│   │   ├── Prediction.jsx         # User Portal
│   │   ├── DataDashboard.jsx      # User Portal
│   │   └── developer/             # Developer Portal (6 modul)
│   │       ├── DevOverview.jsx
│   │       ├── DevDatasets.jsx
│   │       ├── DevEtl.jsx
│   │       ├── DevModels.jsx
│   │       ├── DevPlayground.jsx
│   │       └── DevApi.jsx
│   ├── services/
│   │   └── api.js
│   ├── hooks/
│   │   └── usePrediction.js       # dipakai ulang User Portal + Playground
│   ├── utils/
│   │   └── formatCurrency.js
│   ├── App.jsx                    # pemisah portal: hash #/developer/* → DeveloperShell
│   └── main.jsx
├── package.json
└── Dockerfile
```

### Route map (termasuk port)

| Rute | Portal | Port | Modul |
|-|-|-:|-|
| `#/` | User | 80 | Beranda |
| `#/data` | User | 80 | Data dashboard |
| `#/prediksi` | User | 80 | Estimasi + SHAP |
| `#/developer` | Developer | 8081 (loopback) | Business/System Overview |
| `#/developer/datasets` | Developer | 8081 (loopback) | Dataset Management (upload Update/Replace) |
| `#/developer/etl` | Developer | 8081 (loopback) | ETL Management (riwayat job) |
| `#/developer/models` | Developer | 8081 (loopback) | Model Management (versi + metrik) |
| `#/developer/playground` | Developer | 8081 (loopback) | Prediction Playground |
| `#/developer/api` | Developer | 8081 (loopback) | API Explorer (katalog + Swagger UI) |

### Developer Portal Surfaces

1. **Overview** — service health, active dataset, active model, ETL readiness, and deployment status.
2. **Datasets** — upload dataset, inspect validation result, run/poll ETL status, view dataset versions, and inspect row counts.
3. **Models** — list model versions, metrics, training dataset version, artifact status, and active model.
4. **Prediction Playground** — submit a sample vehicle input and inspect prediction + SHAP explanation.
5. **API Explorer** — embedded Swagger UI generated from the same FastAPI OpenAPI contract used by the backend.

# 7\. Sequence Diagram — Prediction + SHAP Explanation

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

    User->>UI: Enter vehicle attributes
    User->>UI: Click Predict
    UI->>API: POST /api/v1/predictions
    API->>VAL: Validate request
    VAL-->>API: Validated payload
    API->>SVC: predict(payload)
    SVC->>PIPE: transform(payload)
    PIPE-->>SVC: model-ready features
    SVC->>MODEL: predict(features)
    MODEL-->>SVC: predicted price
    SVC->>XAI: explain(features)
    XAI->>MODEL: obtain prediction/model contribution
    XAI-->>SVC: SHAP values
    SVC->>DB: Save prediction + model version
    DB-->>SVC: persisted
    SVC-->>API: prediction + explanation
    API-->>UI: JSON response
    UI-->>User: Price + SHAP visualization
```

### Target response

```json
{
  "prediction\\\_id": "uuid",
  "model\\\_version": "xgb-v1",
  "predicted\\\_price": 285000000,
  "currency": "IDR",
  "explanation": {
    "base\\\_value": 247000000,
    "features": \\\[
      {
        "feature": "year",
        "value": 2021,
        "shap\\\_value": 21500000
      },
      {
        "feature": "KM\\\_1",
        "value": 45000,
        "shap\\\_value": -12000000
      }
    ]
  }
}
```

\---

# 8\. Sequence Diagram — Dataset Upload + ETL

```mermaid
sequenceDiagram
    autonumber
    actor Developer
    participant PORTAL as Developer Portal
    participant API as FastAPI
    participant VAL as Pydantic
    participant ETL as ETL Engine
    participant STG as Staging Storage
    participant DB as PostgreSQL

    Developer->>PORTAL: Select dataset file
    PORTAL->>API: POST /api/v1/datasets/upload
    API->>VAL: Validate upload metadata
    VAL-->>API: Validated request
    API->>STG: Save uploaded file
    STG-->>API: staging file path
    API->>ETL: process(dataset)
    ETL->>STG: Read staged file
    ETL->>ETL: Schema validation
    ETL->>ETL: Data quality checks
    ETL->>ETL: Filter Bekas/Used
    ETL->>ETL: Feature transformation
    ETL->>DB: Persist approved dataset version
    DB-->>ETL: dataset version created
    ETL-->>API: ETL result + dataset version
    API-->>PORTAL: ETL status/result
    PORTAL-->>Developer: Dataset version + validation summary
```

### ETL Rules

* Uploaded files are treated as **staging input**, not as immediately trusted production data.
* ETL must validate the required schema before persistence.
* The current CP scope keeps the transformation deterministic and reproducible.
* A dataset version is created only after successful validation and persistence.
* ETL does **not** automatically retrain or automatically deploy a new model.
* The developer explicitly triggers model training from the Developer Portal after a dataset version is ready.
* Rejected rows, if supported, must be counted and reported without silently changing the source file.

---

# 9\. Sequence Diagram — Model Training

```mermaid
sequenceDiagram
    autonumber
    actor Developer
    participant PORTAL as Developer Portal
    participant API as FastAPI
    participant DB as PostgreSQL
    participant PRE as Preprocessing
    participant XGB as XGBoost
    participant EVAL as Evaluation
    participant SHAP as SHAP
    participant FS as Artifact Volume

    Developer->>PORTAL: Select READY dataset version
    Developer->>PORTAL: Click Train Model
    PORTAL->>API: POST /api/v1/models/train
    API->>DB: Load approved dataset version
    DB-->>API: Training records + metadata
    API->>PRE: Fit preprocessing on train set
    PRE-->>API: Fitted pipeline
    API->>XGB: Train model
    XGB-->>API: Trained model
    API->>EVAL: Evaluate on validation/test set
    EVAL-->>API: MAE/RMSE/MAPE/R2
    API->>SHAP: Initialize explainer
    SHAP-->>API: Explainer configuration
    API->>FS: Save model artifact
    API->>FS: Save preprocessing artifact
    API->>FS: Save SHAP metadata
    API->>DB: Save model version + metrics
    DB-->>API: Model version created
    API-->>PORTAL: Training result
    PORTAL-->>Developer: Metrics + model version
```

# 10\. Entity-Relationship Diagram (ERD)

CP memakai PostgreSQL terutama untuk **dataset terkurasi, dataset versioning, model registry sederhana, prediction logs, evaluation metadata, serta status ETL/training job**.

```mermaid
erDiagram
    DATASET ||--o{ LISTING : contains
    DATASET ||--o{ ETL_JOB : processed_by
    DATASET ||--o{ MODEL_VERSION : trains
    MODEL_VERSION ||--o{ PREDICTION : produces
    LISTING ||--o{ PREDICTION : may_be_reference
    MODEL_VERSION ||--o{ MODEL_METRIC : has

    DATASET {
        uuid id PK
        varchar name
        varchar source
        varchar version
        varchar status
        bigint row_count
        bigint valid_rows
        bigint rejected_rows
        timestamp created_at
    }

    ETL_JOB {
        uuid id PK
        uuid dataset_id FK
        varchar status
        varchar staging_path
        varchar schema_version
        timestamp started_at
        timestamp finished_at
        text error_message
    }

    LISTING {
        bigint id PK
        uuid dataset_id FK
        varchar listing_type
        varchar brand
        varchar brand_type
        varchar machine_type
        varchar location
        integer year
        integer km_1
        integer km_2
        bigint price
        timestamp created_at
    }

    MODEL_VERSION {
        uuid id PK
        uuid dataset_id FK
        varchar model_name
        varchar version
        varchar artifact_path
        varchar preprocessing_path
        timestamp trained_at
        boolean active
    }

    MODEL_METRIC {
        uuid id PK
        uuid model_version_id FK
        varchar split_name
        numeric mae
        numeric rmse
        numeric mape
        numeric r2
    }

    PREDICTION {
        uuid id PK
        uuid model_version_id FK
        bigint listing_id FK
        bigint predicted_price
        jsonb input_payload
        jsonb shap_payload
        timestamp created_at
    }
```

## ERD Design Notes

### `DATASET`
Menyimpan metadata dataset terkurasi dan version identifier. Dataset hanya dianggap `READY` setelah ETL berhasil.

### `ETL_JOB`
Menyimpan status dan metadata eksekusi ETL. File staging tidak dianggap sebagai dataset produksi.

### `LISTING`
Menyimpan observasi mobil bekas yang telah lolos ETL.

### `MODEL_VERSION`
Bertindak sebagai mini model registry dengan referensi ke dataset version yang digunakan saat training.

### `MODEL_METRIC`
Menyimpan metrik berdasarkan split (`validation`, `test`, dan set lain jika diperlukan).

### `PREDICTION`
Menyimpan audit trail prediksi dan hasil explanation.

`shap_payload` menggunakan `JSONB` agar struktur explanation dapat disimpan fleksibel tanpa membuat puluhan tabel tambahan.

# 11\. Data Flow Diagram (DFD) — Level 0

```mermaid
flowchart LR
    USER[User]
    DEV[Developer]

    PORTAL[Developer Portal / User Dashboard]
    SYS[CP Prediction System]
    ETL[ETL Engine]
    DB[(PostgreSQL)]
    ART[Model Artifacts]

    USER -->|Vehicle Input| SYS
    SYS -->|Predicted Price + Explanation| USER

    DEV -->|Upload Dataset / ETL / Training / API Test| PORTAL
    PORTAL -->|API Requests| SYS
    SYS --> ETL
    ETL --> DB
    SYS <--> DB
    SYS <--> ART
    SYS -->|Metrics / Model Status / ETL Status| PORTAL
```

# 12\. DFD — Level 1

```mermaid
flowchart TB
    USER[User]
    RESEARCHER[Developer / Researcher]

    P1[1. Dataset Upload]
    P2[2. ETL & Validation]
    P3[3. Dataset Publishing]
    P4[4. Model Training]
    P5[5. Prediction]
    P6[6. SHAP Explanation]
    P7[7. Evaluation & Logging]
    P8[8. Developer Portal / API Testing]

    D1[(D1 PostgreSQL)]
    D2[(D2 Model Artifact Volume)]
    D3[/D3 Staging Storage/]

    RESEARCHER -->|CSV dataset| P1
    P1 --> D3
    P1 --> P8
    P8 -->|ETL trigger| P2
    P2 -->|validated dataset| P3
    P3 --> D1

    D1 --> P4
    P4 --> D2
    P4 --> P7
    P7 --> D1

    USER -->|Vehicle attributes| P5
    D2 --> P5
    P5 --> P6
    P6 --> D2
    P6 --> P7
    P7 --> D1

    P5 -->|Price| USER
    P6 -->|Explanation| USER

    P8 -->|Model / dataset / ETL status| RESEARCHER
    P8 -->|Prediction playground| P5
```

# 13\. Component Diagram

```mermaid
flowchart TB
    subgraph Frontend
        FE[ReactJS User Dashboard]
        DEV[ReactJS Developer Portal]
        FEAPI[API Client]
        SHAPUI[SHAP Visualization]
        SW[Swagger UI / API Explorer]
    end

    subgraph Backend
        ROUTER[FastAPI Routers]
        SCHEMA[Pydantic Schemas]
        PRED[Prediction Service]
        EXPL[Explanation Service]
        DATA[Dataset Service]
        ETLSVC[ETL Service]
        MODEL[Model Service]
        REPO[Repository Layer]
    end

    subgraph ETL
        E1[File Reader]
        E2[Schema Validator]
        E3[Data Quality Check]
        E4[Transformer / Filter]
        E5[Dataset Versioner]
    end

    subgraph ML
        PREP[Preprocessing Pipeline]
        XGB[XGBoost Artifact]
        SHAP[SHAP Explainer]
        TRAIN[Training Pipeline]
        EVAL[Evaluation]
    end

    subgraph Persistence
        STG[/Staging Volume/]
        PG[(PostgreSQL)]
        VOL[(Model Artifact Volume)]
    end

    subgraph APIContract
        OPEN[OpenAPI Contract]
    end

    FE --> FEAPI
    DEV --> FEAPI
    DEV --> SW
    FEAPI --> ROUTER
    ROUTER --> SCHEMA
    SCHEMA --> PRED
    SCHEMA --> EXPL
    SCHEMA --> DATA
    SCHEMA --> ETLSVC
    SCHEMA --> MODEL

    PRED --> PREP
    PREP --> XGB

    EXPL --> PREP
    EXPL --> XGB
    EXPL --> SHAP

    DATA --> REPO
    ETLSVC --> E1
    E1 --> STG
    E1 --> E2
    E2 --> E3
    E3 --> E4
    E4 --> E5
    E5 --> REPO

    MODEL --> TRAIN
    TRAIN --> PREP
    TRAIN --> XGB
    TRAIN --> EVAL
    TRAIN --> SHAP
    TRAIN --> VOL

    REPO --> PG
    XGB --> VOL
    PREP --> VOL
    SHAP --> VOL

    ROUTER --> OPEN
    OPEN --> SW
```

### Developer Portal Principle

Developer Portal adalah **application control plane** yang hanya menggunakan endpoint resmi. Tidak ada direct database access dari browser, tidak ada filesystem editing dari browser, dan tidak ada source-code modification melalui portal.

# 14\. Deployment Diagram — Docker

```mermaid
flowchart TB
    Browser[Browser]

    subgraph DockerHost[Docker Host / Server]
        subgraph Compose[Docker Compose Network]
            NGINX[nginx\n:80 publik + :8081 loopback]
            FRONT[frontend\n:80 User Portal + :8081 Developer Portal]
            API[backend\nFastAPI + Uvicorn + ETL]
            DB[(postgres\nPostgreSQL)]

            subgraph Volumes[Persistent Volumes]
                PGVOL[(postgres_data)]
                MLVOL[(model_artifacts)]
                STG[(/staging)]
            end
        end
    end

    Browser -->|":80"| NGINX
    Localhost -->|"127.0.0.1:8081"| NGINX
    NGINX --> FRONT
    NGINX --> API
    API --> DB
    API --> STG
    API --> MLVOL
    DB --> PGVOL
```

### Isolasi port (Developer Portal tidak untuk user biasa)

| Portal | Port host | Bind | Akses |
|-|-|-|-|
| User Portal | `80` | `0.0.0.0` (publik) | Semua user |
| Developer Portal | `${DEVELOPER_PORT:-8081}` | `127.0.0.1` (loopback-only) | Developer via localhost/SSH tunnel |

Lapisan isolasi:

1. **Port berbeda + loopback-only**: compose mem-publish port developer hanya ke
   `127.0.0.1`, sehingga tidak terjangkau dari jaringan.
2. **Entry build terpisah**: `index.html` (user) vs `developer.html` (developer);
   bundle user tidak memuat rute/navigasi developer.
3. **Blokir silang di nginx frontend**: port `:80` me-return 404 untuk
   `/developer.html` dan chunk `/assets/developer*`; port `:8081` me-return 404
   untuk `/index.html`.
4. **Tanpa link silang**: User Portal tidak menampilkan link ke Developer Portal;
   satu-satunya jalan adalah URL + port yang hanya diketahui developer.
5. `noindex, nofollow` pada `developer.html` agar tidak terindeks mesin pencari.

### Docker services

|Service|Image/Build|Port internal|Purpose|
|-|-|-:|-|
|`nginx`|`nginx:alpine`|80, 8081|Reverse proxy (publik + developer loopback)|
|`frontend`|custom React build|80 (user), 8081 (developer)|User Portal + Developer Portal (entry terpisah)|
|`backend`|custom Python image|8000|FastAPI + ETL + ML orchestration|
|`postgres`|`postgres:16-alpine`|5432|Curated dataset + metadata + logs|

External exposure:

```text
User biasa (jaringan)
  ↓
http://<host>               → Nginx :80
  ├── /       → User Portal (frontend :80)
  └── /api/   → FastAPI :8000
  (developer.html diblokir 404 di port ini)

Developer (localhost / SSH tunnel)
  ↓
http://localhost:8081       → Nginx :8081 (bind 127.0.0.1 saja)
  ├── /       → Developer Portal (frontend :8081)
  ├── /api/   → FastAPI :8000
  ├── /docs   → Swagger UI
  └── /openapi.json → OpenAPI contract
```

PostgreSQL **tidak perlu diekspos ke public network** pada deployment produksi.

# 15\. Docker Compose Target

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "127.0.0.1:${DEVELOPER_PORT:-8081}:8081"
    depends_on:
      - frontend
      - backend
    volumes:
      - ./infra/nginx/nginx.conf:/etc/nginx/nginx.conf:ro

  frontend:
    build: ./frontend
    expose:
      - "80"
      - "8081"

  backend:
    build: ./backend
    expose:
      - "8000"
    environment:
      DATABASE_URL: postgresql+psycopg://app:app@postgres:5432/carprice
      MODEL_DIR: /app/artifacts/model
      STAGING_DIR: /app/staging
    volumes:
      - model_artifacts:/app/artifacts
      - staging_data:/app/staging
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: carprice
      POSTGRES_USER: app
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d carprice"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  model_artifacts:
  staging_data:
```

> Untuk repository nyata, password database **jangan** ditulis hard-coded. Gunakan `.env` lokal dan secret management pada server.

# 16\. REST API Contract

Base URL:

```text
/api/v1
```

## Health

```http
GET /api/v1/health
```

## Prediction

```http
POST /api/v1/predictions
Content-Type: application/json
```

Request:

```json
{
  "brand": "Honda",
  "brand_type": "City 1.5 E Sedan",
  "machine_type": "Automatic",
  "location": "DKI Jakarta",
  "year": 2021,
  "km_1": 45000,
  "km_2": 45000
}
```

## Active Model

```http
GET /api/v1/models/active
```

## Prediction History

```http
GET /api/v1/predictions/{prediction_id}
```

## Developer Portal Endpoints

### Dataset Upload

```http
POST /api/v1/datasets/upload
Content-Type: multipart/form-data
```

Purpose: menerima dataset baru dan memasukkannya ke staging untuk diproses ETL.

### Dataset List

```http
GET /api/v1/datasets
```

### Dataset Detail

```http
GET /api/v1/datasets/{dataset_id}
```

### Dataset ETL

```http
POST /api/v1/datasets/{dataset_id}/etl
```

Purpose: menjalankan ETL terhadap dataset staging.

### ETL Status

```http
GET /api/v1/datasets/{dataset_id}/etl
```

### Model Versions

```http
GET /api/v1/models
```

### Trigger Training

```http
POST /api/v1/models/train
```

Request minimum:

```json
{
  "dataset_version": "ds-v004"
}
```

### Developer Overview

```http
GET /api/v1/developer/overview
```

Purpose: mengembalikan status backend, database, ETL readiness, active dataset, dan active model.

### ETL Job History

```http
GET /api/v1/etl/jobs?limit=20
```

Purpose: riwayat eksekusi ETL untuk modul ETL Management.

### Model List

```http
GET /api/v1/models
```

Purpose: seluruh versi model + metrik untuk modul Model Management.

### Peta modul Developer Portal → endpoint

| Modul | Endpoint utama |
|-|-|
| Business/System Overview | `GET /developer/overview` |
| Dataset Management | `POST /datasets/upload` (mode Update/Replace), `GET /datasets`, `GET /datasets/{id}` |
| ETL Management | `GET /etl/jobs` |
| Model Management | `GET /models`, `GET /models/active` |
| Prediction Playground | `POST /predictions`, `GET /predictions/{id}` |
| API Explorer | `/docs` + `/openapi.json` (Swagger UI via Nginx), katalog endpoint di portal |

## OpenAPI / Swagger Integration

FastAPI menjadi sumber OpenAPI contract. Developer Portal tidak membuat definisi API kedua.

```text
FastAPI
   │
   └── OpenAPI Specification
           │
           ├── Swagger UI
           └── Developer Portal → API Explorer
```

Swagger UI digunakan untuk exploratory testing dan endpoint validation. Business workflow seperti upload → ETL → publish dataset → train model tetap disediakan sebagai UI khusus Developer Portal.

# 17\. ML Pipeline

```mermaid
flowchart LR
    RAW\\\[Raw CSV]
    FILTER\\\[Filter Used/Bekas]
    QC\\\[Data Quality Check]
    FE\\\[Feature Engineering]
    SPLIT\\\[Train/Validation/Test Split]
    ENC\\\[Categorical Encoding]
    XGB\\\[XGBoost Training]
    EVAL\\\[Evaluation]
    SHAP\\\[SHAP Explainer]
    SAVE\\\[Save Artifacts]

    RAW --> FILTER --> QC --> FE --> SPLIT --> ENC --> XGB --> EVAL
    XGB --> SHAP
    EVAL --> SAVE
    SHAP --> SAVE
```

### Reproducibility rules

* Random seed harus disimpan.
* Feature list harus disimpan.
* Encoding configuration harus disimpan.
* Model hyperparameters harus disimpan.
* Dataset version harus disimpan.
* Metric hasil training harus disimpan.
* Model artifact harus memiliki version identifier.

\---

# 18\. Model Artifact Convention

Contoh:

```text
artifacts/
└── models/
    └── xgboost/
        └── xgb-v1/
            ├── model.json
            ├── preprocessing.joblib
            ├── feature\\\_schema.json
            ├── metrics.json
            ├── training\\\_config.json
            └── shap\\\_config.json
```

`model\\\_version` yang sama harus mengikat:

```text
model
+ preprocessing
+ feature schema
+ metrics
+ SHAP configuration
```

Tujuannya agar model yang digunakan saat inference dapat direproduksi.

\---

# 19\. API Security \& Reliability — CP Minimum

Walaupun authentication belum menjadi fokus CP, backend minimal harus memiliki:

* CORS configuration yang eksplisit.
* Request validation dengan Pydantic.
* Upper/lower bound validation untuk numeric fields.
* Error handling terstruktur.
* Logging request/error tanpa menyimpan data sensitif yang tidak diperlukan.
* Health endpoint.
* Database connection pooling.
* Timeout untuk request inference.

Contoh validation:

```text
1930 <= year <= current\\\_allowed\\\_limit
0 <= km\\\_1 <= reasonable\\\_upper\\\_bound
0 <= km\\\_2 <= reasonable\\\_upper\\\_bound
price output >= 0
```

Bounds final harus disesuaikan dengan distribusi data penelitian, bukan dibuat tanpa dasar.

\---

### Developer Portal Security / Reliability Minimum

* Developer Portal hanya boleh menggunakan backend API resmi.
* File upload harus memiliki size/type validation.
* ETL job tidak boleh mengeksekusi arbitrary uploaded code.
* Training harus dipicu melalui parameter dataset version yang tervalidasi.
* Developer Portal tidak boleh menerima database credentials.
* Swagger/OpenAPI testing menggunakan endpoint yang sama dengan application API.
* Model activation, bila digunakan, tetap merupakan operasi eksplisit dan tidak otomatis terjadi setelah training.


# 20\. Testing Strategy

## Backend

### Unit test

* ETL parser
* schema validation
* data quality rules
* preprocessing
* prediction service
* SHAP service
* repository
* model service

### API test

* `GET /health`
* valid prediction request
* invalid categorical input
* invalid numeric input
* model unavailable scenario
* dataset upload
* dataset validation failure
* ETL success/failure
* model training trigger
* developer overview

## Developer Portal

* dataset upload form
* ETL status rendering
* validation result rendering
* dataset version list
* model version and metrics rendering
* prediction playground
* API Explorer / Swagger `Try it out`
* overview/status rendering

## Frontend

* form validation
* loading state
* error state
* prediction rendering
* SHAP chart rendering
* Developer Portal route rendering

## Integration test

### User prediction flow

```text
React User Dashboard
 → Nginx
 → FastAPI
 → XGBoost
 → SHAP
 → PostgreSQL
```

### Developer dataset flow

```text
Developer Portal
 → Nginx
 → FastAPI
 → Staging
 → ETL
 → PostgreSQL
```

### Developer training flow

```text
Developer Portal
 → FastAPI
 → PostgreSQL dataset version
 → Training Pipeline
 → XGBoost + SHAP
 → Model Artifacts
 → PostgreSQL model metadata
```

### API Explorer flow

```text
Developer Portal
 → Swagger UI
 → OpenAPI
 → FastAPI endpoint
 → Response / validation error
```

# 21\. CP Acceptance Criteria

CP dianggap secara teknis selesai apabila:

### Data & ETL

* [ ] Dataset dapat di-upload melalui Developer Portal.
* [ ] Uploaded file disimpan di staging sebelum dipublish.
* [ ] Dataset schema dapat divalidasi.
* [ ] ETL dapat dijalankan tanpa manual code editing.
* [ ] Dataset dapat difilter ke `Bekas`/`Used`.
* [ ] Dataset version dapat dibuat dan dilacak.
* [ ] Dataset terkurasi tersimpan di PostgreSQL.

### Machine Learning

* [ ] Pipeline preprocessing dapat dijalankan tanpa manual intervention.
* [ ] XGBoost dapat dilatih dan disimpan sebagai artifact.
* [ ] Model menghasilkan prediction pada test set.
* [ ] MAE, RMSE, MAPE, R² berhasil dihitung.
* [ ] SHAP global explanation berhasil dibuat.
* [ ] SHAP local explanation berhasil dibuat untuk sebuah listing/input.
* [ ] Model version dapat ditelusuri ke dataset version.

### Backend & Portal

* [ ] FastAPI menyediakan endpoint prediction.
* [ ] FastAPI menyediakan dataset/ETL endpoints.
* [ ] FastAPI menyediakan model metadata/training endpoints.
* [ ] ReactJS dapat mengirim input ke backend.
* [ ] ReactJS menampilkan predicted price.
* [ ] ReactJS menampilkan SHAP explanation.
* [ ] Developer Portal menampilkan system overview.
* [ ] Developer Portal dapat meng-upload dataset.
* [ ] Developer Portal menampilkan hasil ETL dan dataset version.
* [ ] Developer Portal menampilkan model metrics/version.
* [ ] Developer Portal menyediakan prediction playground.
* [ ] Developer Portal menyediakan Swagger/OpenAPI API Explorer.
* [ ] Tidak diperlukan source-code editing untuk melakukan upload, ETL, API test, training trigger, dan prediction test.

### Deployment

* [ ] PostgreSQL menyimpan dataset metadata dan prediction log.
* [ ] Semua service dapat dijalankan dengan `docker compose up`.
* [ ] Staging dan model artifacts menggunakan persistent volumes.
* [ ] PostgreSQL tidak diekspos ke public network.

# 22\. Suggested Repository Structure

```text
car-price-xai/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── prediction/
│   │   │   └── developer/
│   │   ├── pages/
│   │   │   ├── user/
│   │   │   └── developer/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── utils/
│   ├── package.json
│   └── Dockerfile
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── routes_health.py
│   │   │   ├── routes_prediction.py
│   │   │   ├── routes_model.py
│   │   │   ├── routes_dataset.py
│   │   │   ├── routes_etl.py
│   │   │   └── routes_developer.py
│   │   ├── core/
│   │   ├── db/
│   │   ├── etl/
│   │   │   ├── reader.py
│   │   │   ├── validator.py
│   │   │   ├── transformer.py
│   │   │   └── publisher.py
│   │   ├── ml/
│   │   │   ├── preprocessing.py
│   │   │   ├── train.py
│   │   │   ├── predict.py
│   │   │   └── explain.py
│   │   ├── repositories/
│   │   ├── schemas/
│   │   └── services/
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
│
├── ml/
│   ├── notebooks/
│   ├── scripts/
│   └── experiments/
│
├── data/
│   ├── staging/
│   └── reference/
│
├── artifacts/
│   └── models/
│
├── infra/
│   └── nginx/
│       └── nginx.conf
│
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

# 23\. Recommended Development Sequence

## Phase 1 — Data & ML Baseline

1. Profiling dataset.
2. Filtering `Bekas`/`Used`.
3. Data quality checks.
4. Feature selection.
5. Feature engineering.
6. Preprocessing pipeline.
7. XGBoost baseline.
8. Evaluation.
9. SHAP global/local.

**Output:** reproducible ML artifact.

## Phase 2 — Dataset Management & ETL

1. PostgreSQL schema.
2. Dataset and ETL job models.
3. Dataset upload endpoint.
4. Staging storage.
5. ETL validation rules.
6. Data transformation.
7. Dataset version publishing.
8. Dataset list/detail endpoints.

**Output:** upload → ETL → approved dataset workflow.

## Phase 3 — Backend & Model Management

1. FastAPI project.
2. Pydantic schemas.
3. Model loading service.
4. Prediction endpoint.
5. SHAP endpoint/result integration.
6. Model metadata endpoints.
7. Training trigger endpoint.
8. Prediction logging.
9. Developer overview endpoint.

**Output:** working REST API + model management API.

## Phase 4 — Developer Portal

1. Developer overview.
2. Dataset upload UI.
3. ETL status and result UI.
4. Dataset version list.
5. Model version + metrics UI.
6. Prediction playground.
7. Embedded Swagger/OpenAPI API Explorer.

**Output:** developer control/testing console tanpa source-code editing.

## Phase 5 — User Dashboard

1. ReactJS vehicle form.
2. API client.
3. Prediction card.
4. SHAP visualizations.
5. Error/loading states.

**Output:** working demonstration UI.

## Phase 6 — Containerization & End-to-End Testing

1. Backend Dockerfile.
2. Frontend Dockerfile.
3. PostgreSQL container.
4. Nginx configuration.
5. Staging/model artifact volumes.
6. Docker Compose.
7. Developer Portal flow test.
8. User prediction flow test.
9. End-to-end test.
10. Final documentation.

**Output:** one-command CP deployment.

# 24\. Final CP Architecture Decision

Arsitektur yang digunakan — **dua portal terpisah** (bukan satu page):

```text
                    ┌─────────────────────────────────┐
                    │        ReactJS SPA              │
                    ├──────────────┬──────────────────┤
                    │ User Portal  │ Developer Portal │
                    │ (terang)     │ (gelap + badge   │
                    │ #/           │  DEV)             │
                    │ #/data       │  ├─ Overview     │
                    │ #/prediksi   │  ├─ Datasets     │
                    │              │  ├─ ETL          │
                    │              │  ├─ Models       │
                    │              │  ├─ Playground   │
                    │              │  └─ API Explorer │
                    │              │     └─ Swagger   │
                    └──────┬───────┴─────────┬────────┘
                           │                 │
                       REST/JSON         REST/JSON
                           │                 │
                           ▼                 ▼
                   Nginx :80 (publik)   Nginx :8081 (loopback-only)
                            │                 │
                            ▼                 ▼
                                     FastAPI :8000
                    (single entry: /api, /docs, /openapi.json)
                                       │
               ┌───────────────────────┼────────────────────────┐
               │                       │                        │
               ▼                       ▼                        ▼
         Dataset / ETL           Prediction / XAI        Model Management
               │                       │                        │
               ▼                       ▼                        ▼
         Staging → ETL          Preprocessing → XGB       Training / Metrics
               │                       │                        │
               ▼                       ▼                        ▼
          PostgreSQL             SHAP Explanation       Model Artifacts
               │                       │                        │
               └──────────────┬────────┴────────────────────────┘
                              ▼
                       Versioned Metadata
```

### 24.1 Developer Portal Boundary

Developer Portal adalah **developer-facing control and testing console** yang
berdiri sebagai portal tersendiri — bukan satu menu di dalam User Portal.
User Portal hanya berisi Beranda/Data/Estimasi; seluruh fungsi teknis
hidup di namespace `#/developer/...` dengan shell dan navigasi sendiri.

| Aspek | User Portal | Developer Portal |
|-|-|-|
| Audiens | Publik/peneliti demo | Developer |
| Rute | `#/`, `#/data`, `#/prediksi` | `#/developer/...` (6 modul) |
| Port host | `80` (publik) | `8081` (bind `127.0.0.1` saja) |
| Shell | Terang, sidebar publik | Gelap + badge DEV, nav teknis |
| Fungsi | Estimasi + SHAP | Overview, dataset, ETL, model, playground, API explorer |

Portal dapat:

* upload dataset;
* menjalankan atau memantau ETL;
* melihat dataset versions;
* memicu training secara eksplisit;
* melihat model versions dan metrics;
* menguji prediction + SHAP;
* menguji endpoint melalui Swagger UI;
* melihat system health/status.

Portal tidak dapat:

* mengubah source code;
* mengedit preprocessing logic;
* mengubah model implementation secara live;
* mengeksekusi arbitrary Python;
* mengakses database secara langsung;
* melakukan automatic model deployment.

**Design principle utama:** CP harus dapat mendemonstrasikan seluruh jalur `input → prediction → explanation`, sekaligus menyediakan dataset lifecycle yang terkontrol melalui `upload → ETL → validate → version → train`. Developer Portal menjadi control plane untuk workflow tersebut, sedangkan OpenAPI/Swagger menjadi API testing layer.

# 25\. TA Extension Point

Walaupun dokumen ini khusus CP, arsitektur sengaja dibuat extensible.

## Aplikatif

Tambahkan:

```text
Authentication
+ User Management / RBAC
+ Dashboard analytics
+ Model monitoring
+ Usage analytics
+ Dataset approval workflow
+ Scheduled ETL
+ Deployment CI/CD
+ Automated rollback
```

## Riset

Tambahkan:

```text
Random Forest
+ XGBoost
+ LightGBM
+ SHAP
+ LIME
+ Explanation consistency analysis
+ Statistical testing
```

Backend service tetap dapat dipertahankan; perubahan utama berada pada ML experiment layer dan model registry.

