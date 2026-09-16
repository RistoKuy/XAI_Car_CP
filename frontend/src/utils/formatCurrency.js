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
