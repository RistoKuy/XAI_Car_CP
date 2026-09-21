import { useEffect, useState } from "react";
import { getOverview } from "../../services/api.js";

function Card({ title, children }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-4" aria-label={title}>
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">{title}</h2>
      <div className="mt-2 text-sm">{children}</div>
    </section>
  );
}

export function DevOverview() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getOverview().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <p role="alert" className="text-sm text-red-400">{error}</p>;
  if (!data) return <p className="text-sm text-slate-400">Memuat overview…</p>;

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl font-bold">Business / System Overview</h1>
        <p className="mt-1 text-sm text-slate-400">Status layanan, data, model, dan kesiapan ETL dalam satu layar.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card title="Backend">
          <p>Status: <strong>{data.backend.status}</strong></p>
          <p>Model aktif: <strong>{data.backend.model_version}</strong></p>
          <p>Model loaded: <strong>{data.backend.model_loaded ? "ya" : "tidak"}</strong></p>
        </Card>
        <Card title="Database">
          <p>Listing: <strong>{data.database.listings}</strong></p>
          <p>Dataset: <strong>{data.database.datasets}</strong></p>
          <p>Prediction log: <strong>{data.database.predictions}</strong></p>
        </Card>
        <Card title="Dataset aktif">
          {data.dataset_active
            ? <><p><strong>{data.dataset_active.name}</strong> ({data.dataset_active.version})</p>
                <p>Status: {data.dataset_active.status} — {data.dataset_active.total_listings} listing</p></>
            : <p>Belum ada dataset.</p>}
        </Card>
        <Card title="Model aktif">
          {data.model_active
            ? <><p><strong>{data.model_active.version}</strong></p><p>{data.model_active.model_name}</p></>
            : <p>Belum ada model aktif.</p>}
        </Card>
        <Card title="ETL">
          <p>Total job: <strong>{data.etl.jobs_total}</strong></p>
          <p>Kesiapan: <strong>{data.etl.ready ? "siap" : "belum siap"}</strong></p>
          {data.etl.last_job && (
            <p>Terakhir: {data.etl.last_job.filename} ({data.etl.last_job.mode}, {data.etl.last_job.status})</p>
          )}
        </Card>
      </div>
    </div>
  );
}
