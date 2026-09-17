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
    <section aria-label="Penjelasan kontribusi tiap faktor" className="mt-8">
      <h2 className="mb-1 text-xl font-bold">Faktor apa yang menggeser estimasi ini?</h2>
      <p className="mb-4 text-muted">Nilai awal {formatIDR(explanation.base_value)}, ditambah tiap kontribusi, sama dengan {formatIDR(predictedPrice)}.</p>
      <ol className="grid list-none gap-4 p-0">
        {explanation.features.map((f) => {
          const v = f.shap_value;
          const pct = (Math.abs(v) / max) * 50;
          return (
            <li key={f.feature}>
              <div className="flex items-baseline justify-between gap-4">
                <span className="font-semibold">{FEATURE_LABELS[f.feature] ?? f.feature} <span className="text-sm font-normal text-muted">{formatFeatureValue(f.feature, f.value)}</span></span>
                <span className={`whitespace-nowrap font-bold tabular-nums ${v > 0 ? "text-accentink" : v < 0 ? "text-rust" : ""}`}>{formatSignedIDR(v)}</span>
              </div>
              <div className="relative h-2.5 rounded-full bg-track" aria-hidden="true">
                <span className="absolute bottom-[-2px] left-1/2 top-[-2px] w-0.5 bg-ink"></span>
                <span className={`absolute bottom-0 top-0 rounded-full ${v > 0 ? "bg-accent" : "bg-rust"}`} style={v >= 0 ? { left: "50%", width: `${pct}%` } : { right: "50%", width: `${pct}%` }}></span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
