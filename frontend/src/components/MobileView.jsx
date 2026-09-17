import { useEffect, useState } from "react";
import { PageContent } from "./PageContent.jsx";
import { BrandMark, NAV_ITEMS } from "./navItems.jsx";

// Shell mobile (<768px): header ringkas + hamburger menu + Bottom Navigation Bar.
// Drawer tertutup via tombol, overlay, atau tombol Escape.
function HamburgerMenu({ open, onClose, page }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <>
      <button
        type="button"
        aria-label="Tutup menu"
        onClick={onClose}
        className="fixed inset-0 z-30 cursor-default bg-ink/40"
      />
      <div role="dialog" aria-modal="true" aria-label="Menu navigasi"
        className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-white px-5 py-4 shadow-xl">
        <div className="flex items-center justify-between">
          <BrandMark compact />
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-ink hover:bg-paper"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <nav aria-label="Menu navigasi" className="mt-6 grid gap-1">
          {NAV_ITEMS.map((item) => {
            const active = page === item.key;
            return (
              <a
                key={item.key}
                href={item.href}
                onClick={onClose}
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
      </div>
    </>
  );
}

export function MobileView({ page }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b-2 border-ink bg-paper px-4 py-2.5">
        <a href="#/" className="shrink-0 no-underline" aria-label="Estimasi Mobil Bekas, ke beranda">
          <BrandMark compact />
        </a>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label="Buka menu navigasi"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-ink hover:bg-white"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      <div id="mobile-menu">
        <HamburgerMenu open={menuOpen} onClose={() => setMenuOpen(false)} page={page} />
      </div>

      <main id="konten" className="mx-auto w-full max-w-[42rem] px-4 pb-28 pt-5">
        <PageContent page={page} />
        <footer className="mt-10 text-xs leading-relaxed text-muted">
          <p className="max-w-[34rem]">Hasil berupa estimasi model, bukan harga transaksi pasti.</p>
        </footer>
      </main>

      <nav aria-label="Navigasi bawah"
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-3 border-t-2 border-ink bg-white pb-[env(safe-area-inset-bottom)]">
        {NAV_ITEMS.map((item) => {
          const active = page === item.key;
          return (
            <a
              key={item.key}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={active
                ? "flex min-h-[60px] flex-col items-center justify-center gap-0.5 border-t-[3px] border-accent font-bold text-accentink no-underline"
                : "flex min-h-[60px] flex-col items-center justify-center gap-0.5 border-t-[3px] border-transparent text-muted no-underline hover:text-ink"}
            >
              {item.icon}
              <span className="text-[0.7rem] leading-none">{item.label}</span>
            </a>
          );
        })}
      </nav>
    </div>
  );
}
