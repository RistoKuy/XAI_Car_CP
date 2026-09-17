import { useEffect, useState } from "react";
import { useWindowSize } from "./hooks/useWindowSize.js";
import { DesktopView } from "./components/DesktopView.jsx";
import { MobileView } from "./components/MobileView.jsx";

function route() {
  if (window.location.hash === "#/prediksi") return "prediksi";
  if (window.location.hash === "#/data") return "data";
  return "beranda";
}

// Satu aplikasi, dua shell: <768px Bottom Navigation + hamburger,
// >=768px Sidebar statis. Ganti shell me-remount halaman
// (state formulir tidak terbawa saat memutar/me-resize layar).
export function App() {
  const { isMobile } = useWindowSize(768);
  const [page, setPage] = useState(route());

  useEffect(() => {
    const onHash = () => setPage(route());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return (
    <>
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
      >
        Lewati ke konten
      </a>
      {isMobile ? <MobileView page={page} /> : <DesktopView page={page} />}
    </>
  );
}
