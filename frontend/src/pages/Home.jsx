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
    <div className="mx-auto max-w-[42rem]">
      <h1 className="mb-2 text-3xl font-bold leading-tight sm:text-4xl">Berapa estimasi harga mobil bekas ini?</h1>
      <p className="max-w-[34rem] text-lg text-muted">
        Masukkan data kendaraan, model XGBoost menghitung estimasi harga,
        lalu SHAP menunjukkan faktor apa yang menaikkan atau menurunkannya.
      </p>
      <p className="flex flex-wrap gap-3">
        <a className="btn-primary" href="#/prediksi">Hitung estimasi mobil</a>
        <a className="btn-secondary" href="#/data">Lihat data mobil bekas</a>
      </p>

      <section aria-label="Model yang dipakai" className="my-8 rounded-2xl border border-line bg-white p-5 sm:p-8">
        <h2 className="mb-3 text-xl font-bold">Model yang dipakai</h2>
        {model && test && (
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div><dt className="text-sm text-muted">Versi</dt><dd className="font-bold tabular-nums">{model.model_version}</dd></div>
            <div><dt className="text-sm text-muted">R2 (test)</dt><dd className="font-bold tabular-nums">{Number(test.r2).toFixed(4)}</dd></div>
            <div><dt className="text-sm text-muted">MAPE (test)</dt><dd className="font-bold tabular-nums">{Number(test.mape).toFixed(2)}%</dd></div>
            <div><dt className="text-sm text-muted">MAE (test)</dt><dd className="font-bold tabular-nums">Rp {formatNumber(test.mae)}</dd></div>
          </dl>
        )}
        {!model && !error && <p role="status">Memuat info model...</p>}
        {error && <p role="alert">Info model tidak dapat dimuat: {error}</p>}
      </section>

      <section aria-label="Cara kerja">
        <h2 className="mb-2 text-xl font-bold">Cara kerja</h2>
        <ol className="grid list-decimal gap-3 pl-6">
          <li><strong>Isi data kendaraan.</strong> Merek, tipe, transmisi, lokasi, tahun, dan kilometer.</li>
          <li><strong>Terima estimasi.</strong> Satu angka rupiah sebagai estimasi model, bukan harga transaksi.</li>
          <li><strong>Baca penjelasannya.</strong> Tiap faktor diberi nilai kontribusi terhadap estimasi.</li>
        </ol>
      </section>
    </div>
  );
}
