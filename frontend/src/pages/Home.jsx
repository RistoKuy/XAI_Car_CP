import { useEffect, useState } from "react";
import { getActiveModel } from "../services/api.js";
import { formatNumber } from "../utils/formatCurrency.js";

export function Home() {
  const [model, setModel] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    getActiveModel()
      .then((m) => alive && setModel(m))
      .catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, []);

  const test = model?.metrics?.test;

  return (
    <div className="page">
      <h1>Berapa estimasi harga mobil bekas ini?</h1>
      <p className="lede">
        Masukkan data kendaraan, model XGBoost menghitung estimasi harga,
        lalu SHAP menunjukkan faktor apa yang menaikkan atau menurunkannya.
      </p>
      <p><a className="primary link-btn" href="#/prediksi">Hitung estimasi mobil</a></p>

      <section className="model-box" aria-label="Model yang dipakai">
        <h2>Model yang dipakai</h2>
        {model && test && (
          <dl className="metrics">
            <div><dt>Versi</dt><dd>{model.model_version}</dd></div>
            <div><dt>R2 (test)</dt><dd>{Number(test.r2).toFixed(4)}</dd></div>
            <div><dt>MAPE (test)</dt><dd>{Number(test.mape).toFixed(2)}%</dd></div>
            <div><dt>MAE (test)</dt><dd>Rp {formatNumber(test.mae)}</dd></div>
          </dl>
        )}
        {!model && !error && <p role="status">Memuat info model...</p>}
        {error && <p role="alert">Info model tidak dapat dimuat: {error}</p>}
      </section>

      <section aria-label="Cara kerja">
        <h2>Cara kerja</h2>
        <ol className="steps">
          <li><strong>Isi data kendaraan.</strong> Merek, tipe, transmisi, lokasi, tahun, dan kilometer.</li>
          <li><strong>Terima estimasi.</strong> Satu angka rupiah sebagai estimasi model, bukan harga transaksi.</li>
          <li><strong>Baca penjelasannya.</strong> Tiap faktor diberi nilai kontribusi terhadap estimasi.</li>
        </ol>
      </section>
    </div>
  );
}
