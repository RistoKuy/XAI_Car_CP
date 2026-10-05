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
    <div className="home-page mx-auto max-w-6xl">
      <div className="home-intro">
      <div className="home-kicker"><span className="home-kicker-mark">OV</span><span>OtoValue untuk pasar mobil bekas</span></div>
      <h1 className="mb-3 mt-5 text-4xl font-bold leading-[1.04] sm:text-6xl">Kenali nilai mobil sebelum mengambil keputusan.</h1>
      <p className="max-w-[38rem] text-lg text-muted sm:text-xl">
        OtoValue membantu membaca estimasi harga mobil bekas dengan data yang terbuka:
        masukkan kendaraan, lihat hasilnya, dan pahami alasan di balik angka tersebut.
      </p>
      <p className="mt-7 flex flex-wrap gap-3">
        <a className="btn-primary" href="#/prediksi">Hitung estimasi mobil</a>
        <a className="btn-secondary" href="#/data">Lihat data mobil bekas</a>
      </p>
      </div>

      <div className="home-grid mt-10">
      <section aria-label="Model yang dipakai" className="model-panel rounded-2xl border border-line bg-white p-5 sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4"><div><span className="eyebrow">Model card</span><h2 className="mb-1 mt-2 text-xl font-bold">Model yang dipakai</h2></div><span className="model-mark" aria-hidden="true">XGB</span></div>
        {model && test && (
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div><dt className="text-sm text-muted">Versi</dt><dd className="font-bold tabular-nums">{model.model_version}</dd></div>
            <div><dt className="text-sm text-muted">R2 (test)</dt><dd className="font-bold tabular-nums">{Number(test.r2).toFixed(4)}</dd></div>
            <div><dt className="text-sm text-muted">MAPE (test)</dt><dd className="font-bold tabular-nums">{Number(test.mape).toFixed(2)}%</dd></div>
            <div><dt className="text-sm text-muted">MAE (test)</dt><dd className="font-bold tabular-nums">Rp {formatNumber(test.mae)}</dd></div>
          </dl>
        )}
        {model && test && (
          <aside className="model-disclaimer" aria-label="Penjelasan performa model">
            <strong>Bagaimana membaca performanya?</strong>
            <p>
              Pada data uji, model menemukan pola harga dengan baik (R² {Number(test.r2).toFixed(2)}).
              MAPE {Number(test.mape).toFixed(1)}% berarti selisih rata-rata sekitar angka tersebut dari harga pada data uji,
              sedangkan MAE menunjukkan rata-rata selisih sekitar Rp {formatNumber(Math.round(test.mae))}.
            </p>
            <p className="mb-0">
              Angka ini adalah perkiraan performa pada data uji, bukan jaminan harga transaksi.
              Kondisi mobil, kelengkapan, waktu, dan negosiasi dapat membuat harga sebenarnya berbeda.
            </p>
          </aside>
        )}
        {!model && !error && <p role="status">Memuat info model...</p>}
        {error && <p role="alert">Info model tidak dapat dimuat: {error}</p>}
      </section>

      <section aria-label="Cara kerja" className="process-panel">
        <span className="eyebrow">Alur singkat</span><h2 className="mb-5 mt-2 text-xl font-bold">Dari input ke insight.</h2>
        <ol className="grid list-none gap-4 p-0">
          <li><span className="step-number">01</span><span><strong>Isi data kendaraan.</strong><small>Merek, tipe, transmisi, lokasi, tahun, dan kilometer.</small></span></li>
          <li><span className="step-number">02</span><span><strong>Terima estimasi.</strong><small>Satu angka rupiah sebagai estimasi model.</small></span></li>
          <li><span className="step-number">03</span><span><strong>Baca penjelasannya.</strong><small>Lihat kontribusi setiap faktor melalui SHAP.</small></span></li>
        </ol>
      </section>
      </div>
    </div>
  );
}
