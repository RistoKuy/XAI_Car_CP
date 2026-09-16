import { formatIDR } from "../utils/formatCurrency.js";

export function PredictionCard({ data, onReset }) {
  return (
    <section className="result-card" aria-live="polite" aria-label="Hasil estimasi">
      <p className="eyebrow">Estimasi model <span className="version">{data.model_version}</span></p>
      <p className="price">{formatIDR(data.predicted_price)}</p>
      <p className="disclaimer">Estimasi model XGBoost, bukan harga transaksi pasti.</p>
      <button type="button" className="secondary" onClick={onReset}>Hitung ulang</button>
    </section>
  );
}
