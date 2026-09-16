import { formatIDR } from "../utils/formatCurrency.js";
import { FEATURE_LABELS } from "./ShapWaterfall.jsx";

export function ShapBarChart({ explanation }) {
  const max = Math.max(1, ...explanation.features.map((f) => Math.abs(f.shap_value)));
  const sorted = [...explanation.features].sort((a, b) => Math.abs(b.shap_value) - Math.abs(a.shap_value));
  return (
    <section className="shap" aria-label="Besar pengaruh tiap faktor">
      <h2>Seberapa besar pengaruh tiap faktor?</h2>
      <p className="shap-sub">Nilai absolut kontribusi, dari yang terbesar.</p>
      <ol className="bars">
        {sorted.map((f) => (
          <li key={f.feature} className="bar-row">
            <span className="bar-label">{FEATURE_LABELS[f.feature] ?? f.feature}</span>
            <span className="bar-track" aria-hidden="true">
              <span className="bar-fill" style={{ width: `${(Math.abs(f.shap_value) / max) * 100}%` }}></span>
            </span>
            <span className="bar-num">{formatIDR(Math.abs(f.shap_value))}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
