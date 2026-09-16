import { formatIDR, formatNumber, formatSignedIDR } from "../utils/formatCurrency.js";

export const FEATURE_LABELS = {
  year: "Tahun",
  km_1: "Kilometer",
  brand: "Merek",
  brand_type: "Tipe",
  machine_type: "Transmisi",
  location: "Lokasi",
};

export function formatFeatureValue(feature, value) {
  if (feature === "km_1") return `${formatNumber(value)} km`;
  return String(value);
}

export function ShapWaterfall({ explanation, predictedPrice }) {
  const max = Math.max(1, ...explanation.features.map((f) => Math.abs(f.shap_value)));
  return (
    <section className="shap" aria-label="Penjelasan kontribusi tiap faktor">
      <h2>Faktor apa yang menggeser estimasi ini?</h2>
      <p className="shap-sub">Nilai awal {formatIDR(explanation.base_value)}, ditambah tiap kontribusi, sama dengan {formatIDR(predictedPrice)}.</p>
      <ol className="waterfall">
        {explanation.features.map((f) => {
          const v = f.shap_value;
          const pct = (Math.abs(v) / max) * 50;
          return (
            <li key={f.feature} className="wf-row">
              <div className="wf-head">
                <span className="wf-label">{FEATURE_LABELS[f.feature] ?? f.feature} <span className="wf-value">{formatFeatureValue(f.feature, f.value)}</span></span>
                <span className={`wf-num ${v > 0 ? "pos" : v < 0 ? "neg" : ""}`}>{formatSignedIDR(v)}</span>
              </div>
              <div className="wf-track" aria-hidden="true">
                <span className="wf-zero"></span>
                <span className={`wf-bar ${v > 0 ? "pos" : "neg"}`} style={v >= 0 ? { left: "50%", width: `${pct}%` } : { right: "50%", width: `${pct}%` }}></span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
