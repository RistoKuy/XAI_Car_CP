import { formatIDR } from "../utils/formatCurrency.js";
import { FEATURE_LABELS } from "./ShapWaterfall.jsx";

export function ShapBarChart({ explanation }) {
  const max = Math.max(1, ...explanation.features.map((f) => Math.abs(f.shap_value)));
  const sorted = [...explanation.features].sort((a, b) => Math.abs(b.shap_value) - Math.abs(a.shap_value));
  return (
    <section aria-label="Besar pengaruh tiap faktor" className="mt-8">
      <h2 className="mb-1 text-xl font-bold">Seberapa besar pengaruh tiap faktor?</h2>
      <p className="mb-4 text-muted">Nilai absolut kontribusi, dari yang terbesar.</p>
      <ol className="grid list-none gap-3 p-0">
        {sorted.map((f) => (
          <li key={f.feature} className="grid grid-cols-[5.5rem_1fr] items-center gap-x-3 gap-y-1 sm:grid-cols-[7rem_1fr_auto]">
            <span className="text-[0.95rem] font-semibold">{FEATURE_LABELS[f.feature] ?? f.feature}</span>
            <span className="h-3 overflow-hidden rounded-full bg-track" aria-hidden="true">
              <span className="block h-full rounded-full bg-ink" style={{ width: `${(Math.abs(f.shap_value) / max) * 100}%` }}></span>
            </span>
            <span className="col-start-2 whitespace-nowrap text-sm tabular-nums text-muted sm:col-start-auto">{formatIDR(Math.abs(f.shap_value))}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
