import { PageContent } from "./PageContent.jsx";
import { BrandMark, NAV_ITEMS } from "./navItems.jsx";

// Shell desktop (>=768px): Sidebar statis di kiri + konten lega di kanan.
// Bilah aksen kiri hanya menandai item aktif (sinyal status, bukan hiasan).
// Halaman kolom sempit (beranda, estimasi) digeser setengah lebar sidebar
// agar center terhadap layar, bukan terhadap sisa area konten.
export function DesktopView({ page }) {
  const narrow = page !== "data";
  const screenCenter = narrow ? "xl:-translate-x-[7.5rem]" : "";
  return (
    <div className="flex min-h-screen bg-paper">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r-2 border-ink bg-white px-5 py-6" aria-label="Sidebar">
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
        <p className="mt-auto text-xs leading-relaxed text-muted">
          Estimasi model XGBoost + SHAP untuk demonstrasi penelitian.
        </p>
      </aside>
      <div className="min-w-0 flex-1">
        <main id="konten" className="px-6 py-8 lg:px-10">
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
