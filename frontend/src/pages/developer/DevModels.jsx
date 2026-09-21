import { useEffect, useState } from "react";
import { listModels } from "../../services/api.js";

export function DevModels() {
  const [models, setModels] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    listModels().then((d) => setModels(d.models ?? [])).catch((e) => setError(e.message));
  }, []);

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl font-bold">Model Management</h1>
        <p className="mt-1 text-sm text-slate-400">Mini model registry: versi model, metrik evaluasi, dan model aktif.</p>
      </div>
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      {models.map((m) => (
        <section key={m.model_version} className="rounded-xl border border-slate-800 bg-slate-900 p-4" aria-label={`Model ${m.model_version}`}>
          <p className="font-bold">
            {m.model_version}
            {m.active && (
              <span className="ml-2 rounded bg-emerald-400 px-2 py-0.5 text-xs font-extrabold text-slate-950">ACTIVE</span>
            )}
          </p>
          <p className="text-sm text-slate-400">{m.model_name} — dataset: {m.dataset_id ?? "-"}</p>
          {Object.entries(m.metrics ?? {}).map(([split, met]) => (
            <dl key={split} className="mt-2 grid grid-cols-2 gap-2 rounded-lg bg-slate-950 p-3 text-sm sm:grid-cols-4">
              <div className="col-span-2 sm:col-span-4"><dt className="text-slate-400">Split</dt><dd className="font-bold">{split}</dd></div>
              <div><dt className="text-slate-400">MAE</dt><dd className="font-bold">{met.mae}</dd></div>
              <div><dt className="text-slate-400">RMSE</dt><dd className="font-bold">{met.rmse}</dd></div>
              <div><dt className="text-slate-400">MAPE</dt><dd className="font-bold">{met.mape}</dd></div>
              <div><dt className="text-slate-400">R2</dt><dd className="font-bold">{met.r2}</dd></div>
            </dl>
          ))}
        </section>
      ))}
      <p className="text-xs text-slate-400">
        Training bersifat offline/manual via ml/scripts (tanpa auto-retraining dan tanpa auto-deploy dari portal).
      </p>
    </div>
  );
}
