const BASE = (import.meta.env.VITE_API_URL || "/api/v1").replace(/\/$/, "");
const TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT_MS || 20000);

async function request(path, { method = "GET", body, signal } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
  const onAbort = () => ctrl.abort();
  signal?.addEventListener("abort", onAbort);
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail = data.detail ?? `HTTP ${res.status}`;
      throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
    }
    return data;
  } catch (e) {
    if (e.name === "AbortError") throw new Error("Permintaan melebihi batas waktu, coba lagi.");
    if (e instanceof TypeError) throw new Error("Backend tidak dapat dihubungi, periksa koneksi atau jalankan backend.");
    throw e;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

export const getHealth = (opts) => request("/health", opts);
export const getActiveModel = (opts) => request("/models/active", opts);
export const getPrediction = (id, opts) => request(`/predictions/${id}`, opts);
export const getDatasetStats = (params = {}, opts) => {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== "" && v != null)
  ).toString();
  return request(`/stats/dataset${qs ? `?${qs}` : ""}`, opts);
};
export const createPrediction = (payload, opts) => request("/predictions", { ...opts, method: "POST", body: payload });
export const listDatasets = (opts) => request("/datasets", opts);
export const getDataset = (id, opts) => request(`/datasets/${id}`, opts);
export const listEtlJobs = (limit = 20, opts) => request(`/etl/jobs?limit=${limit}`, opts);
export const listModels = (opts) => request("/models", opts);
export const getOverview = (opts) => request("/developer/overview", opts);
export function swaggerUrl() {
  const base = (import.meta.env.VITE_API_URL || "/api/v1").replace(/\/$/, "");
  if (/^https?:\/\//i.test(base)) return base.replace(/\/api\/v1$/, "") + "/docs";
  return "/docs";
}
export async function uploadDataset(file, mode, opts = {}) {
  const form = new FormData();
  form.append("mode", mode);
  form.append("file", file);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT * 3);
  opts.signal?.addEventListener("abort", () => ctrl.abort());
  try {
    const res = await fetch(`${BASE}/datasets/upload`, { method: "POST", body: form, signal: ctrl.signal });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail = data.detail ?? `HTTP ${res.status}`;
      throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
    }
    return data;
  } catch (e) {
    if (e.name === "AbortError") throw new Error("Upload melebihi batas waktu, coba file lebih kecil.");
    if (e instanceof TypeError) throw new Error("Backend tidak dapat dihubungi, periksa koneksi atau jalankan backend.");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
