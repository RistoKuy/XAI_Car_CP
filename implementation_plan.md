# Implementation Plan — CP

## Explainable AI untuk Prediksi Harga Mobil Bekas

**Judul CP:**
> Implementasi dan Evaluasi Model XGBoost untuk Prediksi Harga Mobil Bekas dengan Explainable Artificial Intelligence Menggunakan SHAP

**Tech Stack utama:**
- Frontend: ReactJS
- Backend/API: FastAPI (Python)
- ML: XGBoost + SHAP + scikit-learn
- Database: PostgreSQL
- ORM: SQLAlchemy
- Validation: Pydantic
- Containerization: Docker + Docker Compose
- Reverse Proxy: Nginx (production/deployment)

---

# 1. Scope CP

CP difokuskan pada pembangunan **proof-of-concept end-to-end** yang dapat:

1. Menyimpan dataset dan metadata model di PostgreSQL.
2. Menyediakan preprocessing pipeline yang reproducible.
3. Melatih model XGBoost untuk prediksi `price`.
4. Mengevaluasi model menggunakan MAE, RMSE, MAPE, dan R².
5. Menghasilkan SHAP global dan local explanation.
6. Menyediakan REST API untuk prediksi dan explanation.
7. Menyediakan ReactJS dashboard sederhana untuk demonstrasi.
8. Menjalankan seluruh stack secara containerized menggunakan Docker.

CP **belum** mencakup:
- multi-model benchmarking RF/XGBoost/LightGBM;
- LIME;
- MLOps auto-retraining;
- concept/data drift;
- sistem rekomendasi MCDM;
- real-time scraping;
- authentication/authorization kompleks.

---

# 2. Dataset Context

Dataset awal yang dianalisis:

- 22.679 rows
- 14 columns
- target: `price`
- categorical: `brand`, `brand_type`, `machine_type`, `location`, `listing__type`
- numeric: `year`, `KM_1`, `KM_2`
- text: `item`, `ellipsize`, `listing__excerpt`
- tidak terdapat missing value pada snapshot dataset saat ini

Keputusan CP:

- Eksperimen utama menggunakan listing `Bekas` dan `Used`.
- Listing `Baru` tidak digunakan pada eksperimen utama karena target penelitian adalah mobil bekas.
- `Unnamed: 0` diperlakukan sebagai index, bukan feature.
- `KM_1` dan `KM_2` dianalisis untuk menghindari redundancy.
- Kolom teks mentah tidak digunakan pada baseline pertama untuk menjaga scope dan mencegah leakage.
- `brand_type` adalah high-cardinality categorical feature dan encoding harus dilakukan di dalam pipeline agar tidak terjadi target leakage.

---

# 3. High-Level Tech Stack

| Layer | Technology | Responsibility |
|---|---|---|
| UI | ReactJS | Form input, prediction page, SHAP visualization |
| HTTP | Axios/fetch | Frontend → FastAPI |
| API | FastAPI | REST endpoint, validation, orchestration |
| Schema | Pydantic | Request/response validation |
| Business Logic | Python service layer | Prediction and explanation logic |
| ML | XGBoost | Price regression |
| Explainability | SHAP | Global/local explanation |
| ML utilities | scikit-learn | preprocessing, split, metrics, pipeline |
| ORM | SQLAlchemy | PostgreSQL access |
| DB | PostgreSQL | Listings, model metadata, prediction logs |
| Container | Docker | Packaging application services |
| Orchestration | Docker Compose | Local/CP deployment |
| Reverse Proxy | Nginx | Serve frontend and route `/api` |
| Config | `.env` | Environment-specific configuration |

---

# 4. System Architecture Diagram

```mermaid
flowchart TB
    U[User / Researcher]

    subgraph Browser[Client]
        R[ReactJS Dashboard]
    end

    subgraph App[Application Layer]
        N[Nginx]
        F[FastAPI]
        V[Pydantic Validation]
        S[Prediction Service]
        X[XAI Service]
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

    U --> R
    R -->|HTTP/JSON| N
    N -->|/api/*| F
    F --> V
    V --> S
    S --> P
    P --> M
    S --> PG
    X --> SH
    X --> M
    X --> P
    X --> PG
    M --> FS
    P --> FS
    SH --> FS
    F --> X
    F --> R
```

### Architecture Notes

- ReactJS hanya bertanggung jawab pada presentation layer.
- FastAPI menjadi single entry point untuk operasi backend.
- Prediction service tidak boleh mengakses database secara langsung dari route handler; gunakan service/repository layer.
- Model dan preprocessing artifact disimpan sebagai versioned artifact pada mounted volume.
- PostgreSQL menyimpan data yang bersifat persistent dan metadata eksperimen.
- SHAP dijalankan backend agar model tidak dikirim ke browser.
- Nginx menjadi reverse proxy pada deployment gabungan.

---

# 5. Backend Component Structure

```text
backend/
├── app/
│   ├── main.py
│   ├── api/
│   │   ├── routes_health.py
│   │   ├── routes_prediction.py
│   │   ├── routes_model.py
│   │   └── routes_dataset.py
│   ├── core/
│   │   ├── config.py
│   │   └── logging.py
│   ├── schemas/
│   │   ├── prediction.py
│   │   └── model.py
│   ├── services/
│   │   ├── prediction_service.py
│   │   ├── explanation_service.py
│   │   └── model_service.py
│   ├── repositories/
│   │   ├── listing_repository.py
│   │   ├── prediction_repository.py
│   │   └── model_repository.py
│   ├── ml/
│   │   ├── preprocessing.py
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

- `api/`: HTTP contract.
- `schemas/`: input/output schema.
- `services/`: business logic.
- `repositories/`: persistence access.
- `ml/`: preprocessing, training, prediction, SHAP.
- `db/`: SQLAlchemy models and session management.
- `artifacts/`: versioned model-related files.

---

# 6. Frontend Component Structure

```text
frontend/
├── src/
│   ├── components/
│   │   ├── VehicleForm.jsx
│   │   ├── PredictionCard.jsx
│   │   ├── ShapWaterfall.jsx
│   │   ├── ShapBarChart.jsx
│   │   └── LoadingState.jsx
│   ├── pages/
│   │   ├── Home.jsx
│   │   └── Prediction.jsx
│   ├── services/
│   │   └── api.js
│   ├── hooks/
│   │   └── usePrediction.js
│   ├── utils/
│   │   └── formatCurrency.js
│   ├── App.jsx
│   └── main.jsx
├── package.json
└── Dockerfile
```

---

# 7. Sequence Diagram — Prediction + SHAP Explanation

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
  "prediction_id": "uuid",
  "model_version": "xgb-v1",
  "predicted_price": 285000000,
  "currency": "IDR",
  "explanation": {
    "base_value": 247000000,
    "features": [
      {
        "feature": "year",
        "value": 2021,
        "shap_value": 21500000
      },
      {
        "feature": "KM_1",
        "value": 45000,
        "shap_value": -12000000
      }
    ]
  }
}
```

---

# 8. Sequence Diagram — Model Training

```mermaid
sequenceDiagram
    autonumber
    actor Researcher
    participant CLI as Training Script
    participant DB as PostgreSQL
    participant PRE as Preprocessing
    participant XGB as XGBoost
    participant EVAL as Evaluation
    participant SHAP as SHAP
    participant FS as Artifact Volume

    Researcher->>CLI: Run training job
    CLI->>DB: Load approved dataset
    DB-->>CLI: Training records
    CLI->>PRE: Fit preprocessing on train set
    PRE-->>CLI: Fitted pipeline
    CLI->>XGB: Train model
    XGB-->>CLI: Trained model
    CLI->>EVAL: Evaluate on validation/test set
    EVAL-->>CLI: MAE/RMSE/MAPE/R2
    CLI->>SHAP: Initialize explainer
    SHAP-->>CLI: Explainer artifact
    CLI->>FS: Save model artifact
    CLI->>FS: Save preprocessing artifact
    CLI->>FS: Save SHAP metadata
    CLI->>DB: Save model version + metrics
    DB-->>CLI: Model version created
    CLI-->>Researcher: Training completed
```

---

# 9. Entity-Relationship Diagram (ERD)

CP memakai PostgreSQL terutama untuk **dataset operational, model registry sederhana, prediction logs, dan evaluation metadata**.

```mermaid
erDiagram
    DATASET ||--o{ LISTING : contains
    MODEL_VERSION ||--o{ PREDICTION : produces
    LISTING ||--o{ PREDICTION : may_be_reference
    MODEL_VERSION ||--o{ MODEL_METRIC : has

    DATASET {
        uuid id PK
        varchar name
        varchar source
        varchar version
        timestamp created_at
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
Menyimpan metadata dataset, bukan hanya raw file.

### `LISTING`
Menyimpan observasi mobil bekas yang telah lolos preprocessing tingkat data.

### `MODEL_VERSION`
Bertindak sebagai mini model registry.

### `MODEL_METRIC`
Menyimpan metrik berdasarkan split (`validation`, `test`, dan set lain jika diperlukan).

### `PREDICTION`
Menyimpan audit trail prediksi dan hasil explanation.

`shap_payload` menggunakan `JSONB` agar struktur explanation dapat disimpan fleksibel tanpa membuat puluhan tabel tambahan.

---

# 10. Data Flow Diagram (DFD) — Level 0

```mermaid
flowchart LR
    USER[User]
    RESEARCHER[Researcher]
    SYS[CP Prediction System]
    DB[(PostgreSQL)]
    ART[Model Artifacts]

    USER -->|Vehicle Input| SYS
    SYS -->|Predicted Price + Explanation| USER

    RESEARCHER -->|Dataset / Training Command| SYS
    SYS -->|Metrics / Model Status| RESEARCHER

    SYS <--> DB
    SYS <--> ART
```

---

# 11. DFD — Level 1

```mermaid
flowchart TB
    USER[User]
    RESEARCHER[Researcher]

    P1[1. Dataset Management]
    P2[2. Preprocessing]
    P3[3. Model Training]
    P4[4. Prediction]
    P5[5. SHAP Explanation]
    P6[6. Evaluation & Logging]

    D1[(D1 PostgreSQL)]
    D2[(D2 Model Artifact Volume)]

    RESEARCHER -->|CSV / dataset| P1
    P1 --> D1

    D1 --> P2
    P2 --> P3
    P3 --> D2
    P3 --> P6
    P6 --> D1

    USER -->|Vehicle attributes| P4
    P4 --> P2
    P2 --> P4
    D2 --> P4
    P4 --> P5
    P5 --> D2
    P5 --> P6
    P6 --> D1
    P4 -->|Price| USER
    P5 -->|Explanation| USER
```

---

# 12. Component Diagram

```mermaid
flowchart TB
    subgraph Frontend
        FE[ReactJS App]
        FEAPI[API Client]
        SHAPUI[SHAP Visualization]
    end

    subgraph Backend
        ROUTER[FastAPI Routers]
        SCHEMA[Pydantic Schemas]
        PRED[Prediction Service]
        EXPL[Explanation Service]
        REPO[Repository Layer]
    end

    subgraph ML
        PREP[Preprocessing Pipeline]
        XGB[XGBoost Artifact]
        SHAP[SHAP Explainer]
    end

    subgraph Persistence
        PG[(PostgreSQL)]
        VOL[(Docker Volume / Model Artifacts)]
    end

    FE --> FEAPI
    FEAPI --> ROUTER
    ROUTER --> SCHEMA
    SCHEMA --> PRED
    SCHEMA --> EXPL
    PRED --> PREP
    PREP --> XGB
    EXPL --> PREP
    EXPL --> XGB
    EXPL --> SHAP
    PRED --> REPO
    EXPL --> REPO
    REPO --> PG
    XGB --> VOL
    PREP --> VOL
    SHAP --> VOL
```

---

# 13. Deployment Diagram — Docker

```mermaid
flowchart TB
    Internet[Browser]

    subgraph DockerHost[Docker Host / Server]
        subgraph Compose[Docker Compose Network]
            NGINX[nginx\n:80]
            FRONT[frontend\nReactJS + Nginx]
            API[backend\nFastAPI + Uvicorn]
            DB[(postgres\nPostgreSQL)]

            subgraph Volumes[Persistent Volumes]
                PGVOL[(postgres_data)]
                MLVOL[(model_artifacts)]
            end
        end
    end

    Internet --> NGINX
    NGINX --> FRONT
    NGINX --> API
    API --> DB
    DB --> PGVOL
    API --> MLVOL
```

### Docker services

| Service | Image/Build | Port internal | Purpose |
|---|---|---:|---|
| `nginx` | `nginx:alpine` | 80 | Reverse proxy |
| `frontend` | custom React build | 80 | Web UI |
| `backend` | custom Python image | 8000 | FastAPI |
| `postgres` | `postgres:16-alpine` | 5432 | Persistent database |

External exposure:

```text
Browser
  ↓
http://localhost
  ↓
Nginx :80
  ├── /       → React frontend
  └── /api/   → FastAPI :8000
```

PostgreSQL **tidak perlu diekspos ke public network** pada deployment produksi.

---

# 14. Docker Compose Target

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    depends_on:
      - frontend
      - backend
    volumes:
      - ./infra/nginx/nginx.conf:/etc/nginx/nginx.conf:ro

  frontend:
    build: ./frontend
    expose:
      - "80"

  backend:
    build: ./backend
    expose:
      - "8000"
    environment:
      DATABASE_URL: postgresql+psycopg://app:app@postgres:5432/carprice
      MODEL_DIR: /app/artifacts/model
    volumes:
      - model_artifacts:/app/artifacts
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
```

> Untuk repository nyata, password database **jangan** ditulis hard-coded. Gunakan `.env` lokal dan secret management pada server.

---

# 15. REST API Contract

Base URL:

```text
/api/v1
```

## Health

```http
GET /api/v1/health
```

Response:

```json
{
  "status": "ok",
  "model_version": "xgb-v1"
}
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

Response:

```json
{
  "prediction_id": "uuid",
  "model_version": "xgb-v1",
  "predicted_price": 285000000,
  "currency": "IDR",
  "explanation": {
    "base_value": 247000000,
    "features": []
  }
}
```

## Model metadata

```http
GET /api/v1/models/active
```

## Prediction history

```http
GET /api/v1/predictions/{prediction_id}
```

---

# 16. ML Pipeline

```mermaid
flowchart LR
    RAW[Raw CSV]
    FILTER[Filter Used/Bekas]
    QC[Data Quality Check]
    FE[Feature Engineering]
    SPLIT[Train/Validation/Test Split]
    ENC[Categorical Encoding]
    XGB[XGBoost Training]
    EVAL[Evaluation]
    SHAP[SHAP Explainer]
    SAVE[Save Artifacts]

    RAW --> FILTER --> QC --> FE --> SPLIT --> ENC --> XGB --> EVAL
    XGB --> SHAP
    EVAL --> SAVE
    SHAP --> SAVE
```

### Reproducibility rules

- Random seed harus disimpan.
- Feature list harus disimpan.
- Encoding configuration harus disimpan.
- Model hyperparameters harus disimpan.
- Dataset version harus disimpan.
- Metric hasil training harus disimpan.
- Model artifact harus memiliki version identifier.

---

# 17. Model Artifact Convention

Contoh:

```text
artifacts/
└── models/
    └── xgboost/
        └── xgb-v1/
            ├── model.json
            ├── preprocessing.joblib
            ├── feature_schema.json
            ├── metrics.json
            ├── training_config.json
            └── shap_config.json
```

`model_version` yang sama harus mengikat:

```text
model
+ preprocessing
+ feature schema
+ metrics
+ SHAP configuration
```

Tujuannya agar model yang digunakan saat inference dapat direproduksi.

---

# 18. API Security & Reliability — CP Minimum

Walaupun authentication belum menjadi fokus CP, backend minimal harus memiliki:

- CORS configuration yang eksplisit.
- Request validation dengan Pydantic.
- Upper/lower bound validation untuk numeric fields.
- Error handling terstruktur.
- Logging request/error tanpa menyimpan data sensitif yang tidak diperlukan.
- Health endpoint.
- Database connection pooling.
- Timeout untuk request inference.

Contoh validation:

```text
1930 <= year <= current_allowed_limit
0 <= km_1 <= reasonable_upper_bound
0 <= km_2 <= reasonable_upper_bound
price output >= 0
```

Bounds final harus disesuaikan dengan distribusi data penelitian, bukan dibuat tanpa dasar.

---

# 19. Testing Strategy

## Backend

### Unit test
- preprocessing
- prediction service
- SHAP service
- repository
- schema validation

### API test
- `GET /health`
- valid prediction request
- invalid categorical input
- invalid numeric input
- model unavailable scenario

## Frontend

- form validation
- loading state
- error state
- prediction rendering
- SHAP chart rendering

## Integration test

```text
React
 → Nginx
 → FastAPI
 → XGBoost
 → SHAP
 → PostgreSQL
```

---

# 20. CP Acceptance Criteria

CP dianggap secara teknis selesai apabila:

- [ ] Dataset dapat dimuat dan divalidasi.
- [ ] Pipeline preprocessing dapat dijalankan tanpa manual intervention.
- [ ] XGBoost dapat dilatih dan disimpan sebagai artifact.
- [ ] Model menghasilkan prediction pada test set.
- [ ] MAE, RMSE, MAPE, R² berhasil dihitung.
- [ ] SHAP global explanation berhasil dibuat.
- [ ] SHAP local explanation berhasil dibuat untuk sebuah listing/input.
- [ ] FastAPI menyediakan endpoint prediction.
- [ ] ReactJS dapat mengirim input ke backend.
- [ ] ReactJS menampilkan predicted price.
- [ ] ReactJS menampilkan SHAP explanation.
- [ ] PostgreSQL menyimpan dataset metadata dan prediction log.
- [ ] Semua service dapat dijalankan dengan `docker compose up`.
- [ ] Model version dapat ditelusuri dari prediction response.

---

# 21. Suggested Repository Structure

```text
car-price-xai/
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── Dockerfile
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── db/
│   │   ├── ml/
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
│   ├── raw/
│   └── processed/
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

---

# 22. Recommended Development Sequence

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

## Phase 2 — Backend

1. PostgreSQL schema.
2. SQLAlchemy models.
3. FastAPI project.
4. Pydantic schemas.
5. Model loading service.
6. Prediction endpoint.
7. SHAP endpoint/result integration.
8. Prediction logging.

**Output:** working REST API.

## Phase 3 — Frontend

1. ReactJS project.
2. Vehicle form.
3. API client.
4. Prediction card.
5. SHAP visualizations.
6. Error/loading states.

**Output:** working demonstration UI.

## Phase 4 — Containerization

1. Backend Dockerfile.
2. Frontend Dockerfile.
3. PostgreSQL container.
4. Nginx configuration.
5. Docker volumes.
6. Docker Compose.
7. End-to-end test.

**Output:** one-command CP deployment.

---

# 23. Final CP Architecture Decision

Arsitektur yang digunakan:

```text
ReactJS
   │
   │ REST/JSON
   ▼
Nginx
   │
   ▼
FastAPI
   │
   ├───────────────┐
   ▼               ▼
Prediction      SHAP/XAI
Service          Service
   │               │
   ▼               ▼
Preprocessing → XGBoost
   │               │
   └───────┬───────┘
           ▼
      PostgreSQL
           │
           ▼
   Prediction Logs /
   Model Metadata

Model + preprocessing + SHAP artifacts
           │
           ▼
      Docker Volume
```

**Design principle utama:** CP harus dapat mendemonstrasikan seluruh jalur `input → prediction → explanation`, tetapi kompleksitas riset tetap ditempatkan pada model XGBoost + SHAP. Benchmarking multi-model, LIME, deployment production tingkat lanjut, dan MLOps ditunda ke TA.

---

# 24. TA Extension Point

Walaupun dokumen ini khusus CP, arsitektur sengaja dibuat extensible.

## Aplikatif

Tambahkan:

```text
Authentication
+ User Management
+ Dashboard analytics
+ Model monitoring
+ Usage analytics
+ Deployment CI/CD
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
