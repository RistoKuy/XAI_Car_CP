import { PageContent } from "./PageContent.jsx";
import { BrandMark, NAV_ITEMS } from "./navItems.jsx";

// Shell desktop (>=768px): Sidebar statis di kiri + konten lega di kanan.
// Bilah aksen kiri hanya menandai item aktif (sinyal status, bukan hiasan).
// Halaman kolom sempit (beranda, estimasi) digeser setengah lebar sidebar
// agar center terhadap layar, bukan terhadap sisa area konten.
function ThemeToggle({ theme, onToggleTheme }) {
  return (
    <button type="button" className="theme-toggle" onClick={onToggleTheme} aria-label={`Gunakan mode ${theme === "light" ? "gelap" : "terang"}`}>
      <span aria-hidden="true">{theme === "light" ? "D" : "L"}</span>
      <span>{theme === "light" ? "Mode gelap" : "Mode terang"}</span>
    </button>
  );
}

export function DesktopView({ page, theme, onToggleTheme }) {
  const narrow = page !== "data";
  const screenCenter = narrow ? "xl:-translate-x-[7.5rem]" : "";
  return (
    <div className="app-shell flex min-h-screen bg-paper">
      <aside className="app-sidebar sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r-2 border-ink bg-white px-5 py-6" aria-label="Sidebar">
        <a href="#/" className="no-underline" aria-label="Estimasi Mobil Bekas, ke beranda">
          <BrandMark />
        </a>
        <nav aria-label="Navigasi utama" className="mt-8 grid gap-1">
          {NAV_ITEMS.map((item) => {
            const active = page === item.key;
            return (
              <a
                key={item.key}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={active
                  ? "flex items-center gap-3 rounded-lg border-l-4 border-accent bg-paper px-3 py-3 font-bold text-ink no-underline"
                  : "flex items-center gap-3 rounded-lg border-l-4 border-transparent px-3 py-3 text-muted no-underline hover:bg-paper hover:text-ink"}
              >
                {item.icon}
                <span>{item.label === "Estimasi" ? "Hitung estimasi" : item.label}</span>
              </a>
            );
          })}
        </nav>
        <div className="mt-8 border-t border-line pt-4">
          <p className="eyebrow mb-3">Tampilan</p>
          <ThemeToggle theme={theme} onToggleTheme={onToggleTheme} />
        </div>
        <p className="mt-auto text-xs leading-relaxed text-muted">
          Estimasi model XGBoost + SHAP untuk demonstrasi penelitian.
        </p>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="app-topbar flex items-center justify-between px-6 py-5 lg:px-10">
          <div><span className="eyebrow">AutoValue / User portal</span><p className="m-0 text-sm text-muted">Estimasi harga mobil bekas berbasis data</p></div>
          <span className="status-dot"><i aria-hidden="true" /> Model aktif</span>
        </header>
        <main id="konten" className="px-6 pb-8 lg:px-10">
          <div className={`mx-auto w-full max-w-6xl ${screenCenter}`}>
            <PageContent page={page} />
          </div>
        </main>
        <footer className="px-6 pb-8 text-sm text-muted lg:px-10">
          <div className={`${narrow ? "mx-auto max-w-[42rem]" : "mx-auto w-full max-w-6xl"} ${screenCenter}`}>
            <p className="max-w-[34rem]">Hasil berupa estimasi model, bukan harga transaksi pasti.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
