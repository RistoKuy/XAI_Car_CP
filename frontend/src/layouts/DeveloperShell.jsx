import { DEV_NAV } from "../developer/devNav.js";
import { DevOverview } from "../pages/developer/DevOverview.jsx";
import { DevDatasets } from "../pages/developer/DevDatasets.jsx";
import { DevEtl } from "../pages/developer/DevEtl.jsx";
import { DevModels } from "../pages/developer/DevModels.jsx";
import { DevPlayground } from "../pages/developer/DevPlayground.jsx";
import { DevApi } from "../pages/developer/DevApi.jsx";

// Shell khusus developer: gelap + badge DEV + navigasi 6 modul.
// Sengaja beda visual dari User Portal agar tidak tertukar:
// User Portal terang untuk publik, portal ini konsol teknis.
// Disajikan dari port tersendiri (loopback-only); link kembali
// memakai URL absolut User Portal agar tidak bocor antar-port.
const USER_PORTAL_URL = (import.meta.env.VITE_USER_PORTAL_URL || "").replace(/\/$/, "")
  || `${window.location.protocol}//${window.location.hostname}`;

export function DeveloperShell({ section }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <a
        href="#dev-konten"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:text-slate-950"
      >
        Lewati ke konten
      </a>
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <span className="rounded bg-amber-400 px-2 py-0.5 text-xs font-extrabold tracking-wide text-slate-950">
            DEV
          </span>
          <span className="font-bold">Developer Portal</span>
          <a href={`${USER_PORTAL_URL}/#/`} className="ml-auto text-sm text-slate-300 underline hover:text-white">
            Kembali ke User Portal
          </a>
        </div>
        <nav aria-label="Navigasi Developer Portal" className="mx-auto w-full max-w-6xl overflow-x-auto px-4 pb-3 sm:px-6">
          <ul className="flex min-w-max gap-1">
            {DEV_NAV.map((item) => {
              const active = section === item.key;
              return (
                <li key={item.key}>
                  <a
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={active
                      ? "block rounded-md bg-amber-400 px-3 py-2 text-sm font-bold text-slate-950 no-underline"
                      : "block rounded-md px-3 py-2 text-sm text-slate-300 no-underline hover:bg-slate-800 hover:text-white"}
                  >
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>
      <main id="dev-konten" className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        {section === "datasets" && <DevDatasets />}
        {section === "etl" && <DevEtl />}
        {section === "models" && <DevModels />}
        {section === "playground" && <DevPlayground />}
        {section === "api" && <DevApi />}
        {section === "overview" && <DevOverview />}
      </main>
      <footer className="mx-auto w-full max-w-6xl px-4 pb-8 text-xs text-slate-400 sm:px-6">
        <p>Konsol teknis: hanya memanggil REST API resmi, tanpa akses database langsung dan tanpa eksekusi kode arbitrer.</p>
      </footer>
    </div>
  );
}
