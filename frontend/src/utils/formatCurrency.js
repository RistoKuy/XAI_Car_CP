const idr = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

export function formatIDR(n) {
  return idr.format(Number(n) || 0);
}

export function formatSignedIDR(n) {
  const v = Number(n) || 0;
  return (v > 0 ? "+" : v < 0 ? "\u2212" : "") + idr.format(Math.abs(v));
}

export function formatNumber(n) {
  return new Intl.NumberFormat("id-ID").format(Number(n) || 0);
}

export function formatShortIDR(n) {
  const v = Number(n) || 0;
  const trim = (x) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(x);
  if (v >= 1e9) return `Rp${trim(v / 1e9)} M`;
  if (v >= 1e6) return `Rp${trim(v / 1e6)} jt`;
  return formatIDR(v);
}
