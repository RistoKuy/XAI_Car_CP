import { swaggerUrl } from "../../services/api.js";

const ENDPOINTS = [
  ["GET", "/api/v1/health", "Status backend + versi model aktif"],
  ["POST", "/api/v1/predictions", "Prediksi harga + SHAP explanation"],
  ["GET", "/api/v1/predictions/{id}", "Detail prediction log"],
  ["GET", "/api/v1/models/active", "Metadata model aktif"],
  ["GET", "/api/v1/models", "Daftar seluruh versi model"],
  ["GET", "/api/v1/datasets", "Daftar dataset + ETL job terakhir"],
  ["GET", "/api/v1/datasets/{id}", "Detail dataset + riwayat ETL"],
  ["POST", "/api/v1/datasets/upload", "Upload CSV + ETL (mode update/replace)"],
  ["GET", "/api/v1/etl/jobs", "Riwayat ETL job"],
  ["GET", "/api/v1/developer/overview", "Agregat overview Developer Portal"],
  ["GET", "/api/v1/stats/dataset", "Statistik dataset terkurasi"],
];

export function DevApi() {
  const docs = swaggerUrl();
  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl font-bold">API Explorer</h1>
        <p className="mt-1 text-sm text-slate-400">
          Kontrak tunggal OpenAPI dari FastAPI. Uji coba interaktif via Swagger UI.
        </p>
      </div>
      <a
        href={docs}
        target="_blank"
        rel="noreferrer"
        className="inline-block w-fit rounded-lg bg-amber-400 px-5 py-2 font-bold text-slate-950 no-underline"
      >
        Buka Swagger UI
      </a>
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="bg-slate-900 text-slate-400">
              <th className="px-3 py-2">Method</th>
              <th className="px-3 py-2">Endpoint</th>
              <th className="px-3 py-2">Kegunaan</th>
            </tr>
          </thead>
          <tbody>
            {ENDPOINTS.map(([m, p, d]) => (
              <tr key={p} className="border-t border-slate-800 bg-slate-950">
                <td className="px-3 py-2 font-bold text-amber-300">{m}</td>
                <td className="px-3 py-2 font-mono text-xs">{p}</td>
                <td className="px-3 py-2 text-slate-300">{d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
