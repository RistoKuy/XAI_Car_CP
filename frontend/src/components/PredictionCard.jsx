import { formatIDR } from "../utils/formatCurrency.js";

export function PredictionCard({ data, onReset }) {
  return (
    <section aria-live="polite" aria-label="Hasil estimasi"
      className="rounded-2xl border border-line border-l-[6px] border-l-accent bg-white p-5 sm:p-8">
      <p className="m-0 text-[0.95rem] text-muted">
        Estimasi model <span className="ml-1 inline-block rounded-full border border-muted px-2.5 py-px text-xs font-bold">{data.model_version}</span>
      </p>
      <p className="my-2 text-[2.5rem] font-extrabold tabular-nums text-accentink">{formatIDR(data.predicted_price)}</p>
      <p className="mb-4 text-muted">Estimasi model XGBoost, bukan harga transaksi pasti.</p>
      <button type="button" className="btn-secondary" onClick={onReset}>Hitung ulang</button>
    </section>
  );
}
