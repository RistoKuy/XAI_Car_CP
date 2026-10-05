import { useEffect, useState } from "react";
import { getDatasetStats } from "../services/api.js";
import { EmptyState, ErrorState, LoadingState } from "../components/LoadingState.jsx";
import { Reveal } from "../components/Reveal.jsx";
import { useWindowSize } from "../hooks/useWindowSize.js";
import { formatIDR, formatNumber, formatShortIDR } from "../utils/formatCurrency.js";

function Tip({ children }) {
  return (
    <span aria-hidden="true"
      className="pointer-events-none absolute -top-2 left-1/2 z-10 w-max max-w-[12rem] -translate-x-1/2 -translate-y-full rounded-lg bg-ink px-3 py-1.5 text-center text-xs leading-snug text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
      {children}
    </span>
  );
}

function DetailWindow({ detail, onClose }) {
  useEffect(() => {
    if (!detail) return undefined;
    const onKeyDown = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [detail, onClose]);

  if (!detail) return null;
  return (
    <div className="chart-dialog-layer">
      <button type="button" className="chart-dialog-backdrop" onClick={onClose} aria-label="Tutup detail chart" />
      <section className="chart-dialog" role="dialog" aria-modal="true" aria-labelledby="chart-dialog-title">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="eyebrow">Detail chart</span>
            <h2 id="chart-dialog-title" className="mt-2 text-xl font-bold">{detail.title}</h2>
          </div>
          <button type="button" className="chart-dialog-close" onClick={onClose} aria-label="Tutup detail chart">×</button>
        </div>
        <dl className="mt-6 grid gap-3">
          <div className="chart-dialog-row"><dt>{detail.label}</dt><dd>{detail.value}</dd></div>
          {detail.share && <div className="chart-dialog-row"><dt>Porsi dari dataset</dt><dd>{detail.share}</dd></div>}
        </dl>
        <p className="mt-5 text-sm leading-relaxed text-muted">{detail.note}</p>
      </section>
    </div>
  );
}

function HBar({ label, text, pct, tip, onSelect }) {
  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect();
    }
  };
  return (
    <li tabIndex={0} role="button" onClick={onSelect} onKeyDown={handleKeyDown} aria-label={`${label}: ${tip}`}
      className="group relative grid grid-cols-[6rem_1fr] items-center gap-x-3 gap-y-1 rounded-lg p-1 sm:grid-cols-[8rem_1fr_auto]">
      <Tip>{tip}</Tip>
      <span className="truncate text-sm font-semibold sm:text-[0.95rem]" title={label}>{label}</span>
      <span className="h-3 overflow-hidden rounded-full bg-track" aria-hidden="true">
        <span className="block h-full rounded-full bg-ink transition-colors duration-150 group-hover:bg-accent" style={{ width: `${pct}%` }}></span>
      </span>
      <span className="col-start-2 whitespace-nowrap text-xs tabular-nums text-muted sm:col-start-auto sm:text-sm">{text}</span>
    </li>
  );
}

function Card({ label, title, sub, children }) {
  return (
    <Reveal>
      <section aria-label={label} className="data-card rounded-2xl border border-line bg-white p-4 shadow-[0_1px_2px_rgba(28,36,48,0.06)] sm:p-8">
        <h2 className="mb-1 text-lg font-bold sm:text-xl">{title}</h2>
        <p className="mb-5 text-sm text-muted sm:text-base">{sub}</p>
        {children}
      </section>
    </Reveal>
  );
}

function YearPie({ data, share, onSelect }) {
  const [hovered, setHovered] = useState(null);
  const top = [...data].sort((a, b) => b.count - a.count).slice(0, 10);
  const sum = top.reduce((acc, y) => acc + y.count, 0) || 1;
  const cx = 110;
  const cy = 110;
  const r = 92;
  let angle = -Math.PI / 2;
  const slices = top.map((y, i) => {
    const frac = y.count / sum;
    const start = angle;
    const end = angle + frac * Math.PI * 2;
    angle = end;
    const large = frac > 0.5 ? 1 : 0;
    const x0 = cx + r * Math.cos(start);
    const y0 = cy + r * Math.sin(start);
    const x1 = cx + r * Math.cos(end);
    const y1 = cy + r * Math.sin(end);
    return { ...y, frac, rank: i, mid: (start + end) / 2, d: `M ${cx} ${cy} L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z` };
  });
  const active = hovered != null ? slices.find((s) => s.year === hovered) : null;

  return (
    <div className="year-pie-wrap">
      <svg className="year-pie" viewBox="0 0 220 220" role="group" aria-label="Sepuluh tahun terbanyak">
        {slices.map((s) => (
          <g key={s.year}>
            <path
              d={s.d}
              fill="var(--accent-strong)"
              fillOpacity={1 - s.rank * 0.08}
              tabIndex={0}
              role="button"
              aria-label={`Tahun ${s.year}: ${s.count} listing (${share(s.count)})`}
              onClick={() => onSelect(s)}
              onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(s); } }}
              onMouseEnter={() => setHovered(s.year)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(s.year)}
              onBlur={() => setHovered(null)}
              className="year-pie-slice"
            />
            {s.rank < 3 && (
              <text
                x={cx + r * 0.62 * Math.cos(s.mid)}
                y={cy + r * 0.62 * Math.sin(s.mid)}
                textAnchor="middle"
                dominantBaseline="middle"
                className="year-pie-label"
                pointerEvents="none"
              >
                {s.year}
                <tspan x={cx + r * 0.62 * Math.cos(s.mid)} dy="1.1em">{share(s.count)}</tspan>
              </text>
            )}
          </g>
        ))}
      </svg>
      {active && (
        <span aria-hidden="true" className="year-pie-tip"
          style={{ left: `${(cx + r * 0.72 * Math.cos(active.mid)) / 220 * 100}%`, top: `${(cy + r * 0.72 * Math.sin(active.mid)) / 220 * 100}%` }}>
          Tahun {active.year}<br />{formatNumber(active.count)} listing ({share(active.count)})
        </span>
      )}
    </div>
  );
}

export function DataDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [selectedChart, setSelectedChart] = useState(null);
  const { isMobile } = useWindowSize(768);

  useEffect(() => {
    if (!isMobile) setSelectedChart(null);
  }, [isMobile]);

  useEffect(() => {
    let alive = true;
    getDatasetStats()
      .then((s) => alive && setStats(s))
      .catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, []);

  if (!stats && !error) return <div className="mx-auto max-w-[42rem]"><h1 className="mb-2 text-[clamp(1.6rem,6vw,1.75rem)] font-bold leading-tight">Data mobil bekas</h1><LoadingState what="statistik database" /></div>;
  if (error) return (
    <div className="mx-auto max-w-[42rem]"><h1 className="mb-2 text-[clamp(1.6rem,6vw,1.75rem)] font-bold leading-tight">Data mobil bekas</h1>
      <ErrorState message={error} onRetry={() => window.location.reload()} />
    </div>
  );
  if (!stats.seeded) return (
    <div className="mx-auto max-w-[42rem]"><h1 className="mb-2 text-[clamp(1.6rem,6vw,1.75rem)] font-bold leading-tight">Data mobil bekas</h1>
      <div role="alert" className="rounded-[10px] border-[1.5px] border-solid border-rust p-6 text-muted">
        <p className="mb-1 font-bold text-ink">Database listings masih kosong</p>
        <p>Tabel listings belum di-seed, jadi belum ada yang bisa ditampilkan. Jalankan <code>python ml/scripts/seed_db.py</code> dengan DATABASE_URL yang benar, lalu muat ulang halaman ini.</p>
      </div>
      <div className="mt-4"><EmptyState /></div>
    </div>
  );

  const total = stats.total;
  const share = (n) => `${((n / total) * 100).toFixed(1).replace(".", ",")}%`;
  const histMax = Math.max(1, ...stats.price_histogram.map((b) => b.count));
  const locMax = Math.max(1, ...stats.by_location.map((l) => l.count));
  const machineTotal = stats.by_machine.reduce((a, m) => a + m.count, 0) || 1;
  const yearAvg = stats.year_avg != null ? stats.year_avg.toFixed(1).replace(".", ",") : "-";
  const kmAvg = stats.km_avg != null ? `${formatNumber(Math.round(stats.km_avg))} km` : "-";
  const openChartDetail = (detail) => {
    if (isMobile) setSelectedChart(detail);
  };

  return (
    <div className="data-dashboard mx-auto w-full max-w-6xl">
      <div className="data-hero max-w-[48rem]">
        <span className="eyebrow">Peta dataset</span>
        <h1 className="mb-2 mt-3 text-[clamp(2rem,7vw,3.5rem)] font-bold leading-[0.98]">Data yang memberi model konteks.</h1>
        <p className="text-base text-muted sm:text-lg">
          {formatNumber(total)} listing mobil bekas dari Bekas dan Used. Jelajahi bentuk
          pasar yang dipelajari model sebelum membuat estimasi.
        </p>
      </div>

      <dl className="data-metrics mt-6 grid grid-cols-2 gap-3 p-0 sm:mt-8 sm:gap-4 lg:grid-cols-4" aria-label="Ringkasan database">
        {[
          ["Total listing", formatNumber(total)],
          ["Harga terendah", formatIDR(stats.price_min)],
          ["Harga rata-rata", formatIDR(Math.round(stats.price_avg))],
          ["Harga tertinggi", formatIDR(stats.price_max)],
          ["Tahun rata-rata", yearAvg],
          ["Kilometer rata-rata", kmAvg],
          ["Merek", formatNumber(stats.brands)],
          ["Lokasi", formatNumber(stats.locations)],
        ].map(([label, value]) => (
          <div key={label} className="m-0 rounded-2xl border border-line bg-white p-3 transition-all duration-150 hover:-translate-y-0.5 hover:border-ink hover:shadow-md sm:p-5">
            <dt className="text-xs text-muted sm:text-sm">{label}</dt>
            <dd className="mt-1 break-words text-base font-extrabold tabular-nums sm:text-xl">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="data-flex-grid mt-6 grid gap-4 sm:gap-6 lg:grid-cols-5">
        <div className="data-flex-cell lg:col-span-3">
          <Card label="Sebaran harga" title="Bagaimana sebaran harga?"
            sub={`Jumlah listing per rentang harga, dari ${formatShortIDR(stats.price_min)} sampai ${formatShortIDR(stats.price_max)}.`}>
            <ol className="price-histogram flex h-40 list-none items-end gap-1.5 border-b-2 border-ink p-0 pt-8 sm:h-56" aria-label="Histogram harga">
              {stats.price_histogram.map((b, i) => (
                <li key={i} tabIndex={0} role="button"
                  onClick={() => openChartDetail({ title: "Sebaran harga", label: "Rentang harga", value: `${formatIDR(Math.round(b.min))} sampai ${formatIDR(Math.round(b.max))}`, share: share(b.count), note: `${formatNumber(b.count)} listing berada dalam rentang ini.` })}
                  onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.currentTarget.click(); } }}
                  aria-label={`Rentang ${formatIDR(Math.round(b.min))} sampai ${formatIDR(Math.round(b.max))}: ${formatNumber(b.count)} listing`}
                  className="group relative flex h-full min-w-0 flex-1 cursor-pointer flex-col items-stretch justify-end">
                  <Tip>{formatIDR(Math.round(b.min))} sampai {formatIDR(Math.round(b.max))}<br />{formatNumber(b.count)} listing ({share(b.count)})</Tip>
                  <span className="min-h-[2px] rounded-t bg-accent transition-colors duration-150 group-hover:bg-accentink" style={{ height: `${(b.count / histMax) * 100}%` }}></span>
                  <span className={`mt-1 overflow-hidden whitespace-nowrap text-[0.6rem] tabular-nums text-muted sm:text-[0.65rem] ${(i % 3 === 0 || i === stats.price_histogram.length - 1) ? "" : "invisible sm:visible"}`}>{formatShortIDR(b.min)}</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
        <div className="data-flex-cell lg:col-span-2">
          <Card label="Transmisi" title="Transmisinya apa?"
            sub="Perbandingan jenis transmisi di database.">
            <ul className="grid list-none gap-4 p-0" aria-label="Perbandingan transmisi">
              {stats.by_machine.map((m) => (
                <li key={m.machine_type} tabIndex={0} role="button"
                  onClick={() => openChartDetail({ title: "Transmisi", label: "Jenis transmisi", value: m.machine_type, share: share(m.count), note: `${formatNumber(m.count)} listing menggunakan transmisi ${m.machine_type}.` })}
                  onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.currentTarget.click(); } }}
                  aria-label={`${m.machine_type}: ${formatNumber(m.count)} listing`}
                  className="group relative rounded-lg p-1">
                  <Tip>{formatNumber(m.count)} listing ({share(m.count)} dari total)</Tip>
                  <div className="transmission-heading mb-1 flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate font-bold">{m.machine_type}</span>
                    <span className="shrink-0 whitespace-nowrap text-xs tabular-nums text-muted sm:text-sm">{formatNumber(m.count)} ({share(m.count)})</span>
                  </div>
                  <span className="block h-4 overflow-hidden rounded-full bg-track" aria-hidden="true">
                    <span className="block h-full rounded-full bg-ink transition-colors duration-150 group-hover:bg-accent" style={{ width: `${(m.count / machineTotal) * 100}%` }}></span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm text-muted">Selisihnya besar: pasar mobil bekas di dataset ini didominasi transmisi otomatis.</p>
          </Card>
        </div>
      </div>

      <div className="data-year-stack mt-4 grid gap-4 sm:mt-6 sm:gap-6">
        <Card label="Sebaran tahun" title="Tahun berapa yang paling umum?"
          sub={`Sepuluh tahun dengan listing terbanyak, dari rentang ${stats.year_min} sampai ${stats.year_max}. Sentuh irisan untuk detail.`}>
          <YearPie
            data={stats.by_year}
            share={share}
            onSelect={(s) => openChartDetail({ title: "Sebaran tahun", label: "Tahun kendaraan", value: s.year, share: share(s.count), note: `${formatNumber(s.count)} listing berada pada tahun ${s.year}.` })}
          />
        </Card>

        <Card label="Lokasi" title="Dari mana datangnya?"
          sub="Jumlah listing per lokasi. Sentuh barisnya untuk pangsa tiap lokasi.">
          <ol className="grid list-none gap-1 p-0">
            {stats.by_location.map((l) => (
              <HBar key={l.location} label={l.location}
                text={formatNumber(l.count)}
                pct={l.count / locMax * 100}
                tip={`${formatNumber(l.count)} listing (${share(l.count)} dari total)`}
                onSelect={() => openChartDetail({ title: "Sebaran lokasi", label: "Lokasi", value: l.location, share: share(l.count), note: `${formatNumber(l.count)} listing berasal dari lokasi ini.` })} />
            ))}
          </ol>
        </Card>
      </div>

      <div className="mt-4 sm:mt-6">
        <Card label="Merek terbanyak" title="Merek apa yang paling banyak terdaftar?"
          sub="Sepuluh merek teratas. Sentuh barisnya untuk pangsa dan harga rata-rata.">
          <ol className="grid list-none gap-1 p-0 sm:grid-cols-2 sm:gap-x-6">
            {stats.top_brands.map((b) => (
              <HBar key={b.brand} label={b.brand}
                text={`${formatNumber(b.count)} listing`}
                pct={b.count / stats.top_brands[0].count * 100}
                tip={`${formatNumber(b.count)} listing (${share(b.count)} dari total), rata-rata ${formatIDR(Math.round(b.avg_price))}`}
                onSelect={() => openChartDetail({ title: "Merek terbanyak", label: "Merek", value: b.brand, share: share(b.count), note: `${formatNumber(b.count)} listing terdaftar dengan merek ini. Harga rata-ratanya ${formatIDR(Math.round(b.avg_price))}.` })} />
            ))}
          </ol>
        </Card>
      </div>
      <DetailWindow detail={selectedChart} onClose={() => setSelectedChart(null)} />
    </div>
  );
}
