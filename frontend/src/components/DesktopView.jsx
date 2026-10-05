import { PageContent } from "./PageContent.jsx";
import { BrandMark, NAV_ITEMS } from "./navItems.jsx";

function ThemeToggle({ theme, onToggleTheme }) {
  return (
    <button type="button" className="theme-toggle" onClick={onToggleTheme} aria-label={`Gunakan mode ${theme === "light" ? "gelap" : "terang"}`}>
      <span aria-hidden="true">{theme === "light" ? "☼" : "◐"}</span>
      <span>{theme === "light" ? "Gelap" : "Terang"}</span>
    </button>
  );
}

export function DesktopView({ page, theme, onToggleTheme }) {
  return (
    <div className="app-shell min-h-screen bg-paper">
      <header className="desktop-nav app-topbar sticky top-0 z-20 border-b border-line px-8 py-5 xl:px-12">
        <a href="#/" className="desktop-brand no-underline" aria-label="OtoValue, ke beranda">
          <BrandMark />
        </a>
        <nav aria-label="Navigasi utama" className="desktop-links">
          {NAV_ITEMS.map((item) => {
            const active = page === item.key;
            return (
              <a
                key={item.key}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`desktop-link ${active ? "is-active" : ""}`}
              >
                {item.icon}
                <span>{item.label === "Estimasi" ? "Hitung estimasi" : item.label}</span>
              </a>
            );
          })}
        </nav>
        <div className="desktop-actions"><span className="status-dot"><i aria-hidden="true" /> Model aktif</span><ThemeToggle theme={theme} onToggleTheme={onToggleTheme} /></div>
      </header>
      <main id="konten" className="desktop-content px-8 pb-12 pt-10 xl:px-12">
        <PageContent page={page} />
      </main>
      <footer className="desktop-footer px-8 pb-10 text-sm text-muted xl:px-12">
        <p>Hasil berupa estimasi model, bukan harga transaksi pasti.</p>
      </footer>
    </div>
  );
}
