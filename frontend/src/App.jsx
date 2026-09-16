import { useEffect, useState } from "react";
import { Home } from "./pages/Home.jsx";
import { Prediction } from "./pages/Prediction.jsx";

function route() {
  return window.location.hash === "#/prediksi" ? "prediksi" : "beranda";
}

export function App() {
  const [page, setPage] = useState(route());

  useEffect(() => {
    const onHash = () => setPage(route());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return (
    <>
      <a className="skip" href="#konten">Lewati ke konten</a>
      <header className="topbar">
        <a className="brand" href="#/">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 13l1.5-4.5A2 2 0 0 1 7.4 7h9.2a2 2 0 0 1 1.9 1.5L20 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <rect x="3" y="13" width="18" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="7.5" cy="18" r="1.4" fill="currentColor" />
            <circle cx="16.5" cy="18" r="1.4" fill="currentColor" />
          </svg>
          <span>Estimasi Mobil Bekas</span>
        </a>
        <nav aria-label="Navigasi utama">
          <a href="#/" aria-current={page === "beranda" ? "page" : undefined}>Beranda</a>
          <a href="#/prediksi" aria-current={page === "prediksi" ? "page" : undefined}>Hitung estimasi</a>
        </nav>
      </header>
      <main id="konten">{page === "prediksi" ? <Prediction /> : <Home />}</main>
      <footer className="footer">
        <p>Hasil berupa estimasi model XGBoost dengan penjelasan SHAP, untuk keperluan demonstrasi penelitian.</p>
      </footer>
    </>
  );
}
