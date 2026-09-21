import { useEffect, useState } from "react";
import { listDatasets, uploadDataset } from "../../services/api.js";

const MODES = [
  { value: "update", label: "Update", hint: "Tambah baris baru ke database, data lama tetap ada." },
  { value: "replace", label: "Replace", hint: "Hapus seluruh data lama, lalu isi dengan dataset baru." },
];

export function DevDatasets() {
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState("update");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [datasets, setDatasets] = useState([]);
  const [listError, setListError] = useState("");

  const refresh = async () => {
    try {
      const data = await listDatasets();
      setDatasets(data.datasets ?? []);
    } catch (e) {
      setListError(e.message);
    }
  };

  useEffect(() => { refresh(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);
    if (!file) {
      setError("Pilih file CSV terlebih dahulu.");
      return;
    }
    setLoading(true);
    try {
      const res = await uploadDataset(file, mode);
      setResult(res);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl font-bold">Dataset Management</h1>
        <p className="mt-1 text-sm text-slate-400">
          Upload CSV, pilih mode Update atau Replace, ETL memvalidasi skema dan memfilter Bekas/Used.
        </p>
      </div>

      <form onSubmit={submit} aria-label="Upload dataset"
        className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <label htmlFor="dataset-file" className="font-bold">File dataset (.csv)</label>
        <input
          id="dataset-file"
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mt-2 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
        />
        {file && (
          <p className="mt-1 text-xs text-slate-400">
            {file.name} — {(file.size / 1024 / 1024).toFixed(2)} MB
          </p>
        )}

        <fieldset className="mt-4">
          <legend className="font-bold">Mode ETL — pilih satu</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Mode ETL">
            {MODES.map((m) => (
              <label
                key={m.value}
                className={`cursor-pointer rounded-lg border px-3 py-2 ${
                  mode === m.value ? "border-amber-400 bg-slate-800" : "border-slate-700"
                }`}
              >
                <span className="flex items-center gap-2 font-bold">
                  <input
                    type="radio"
                    name="etl-mode"
                    value={m.value}
                    checked={mode === m.value}
                    onChange={() => setMode(m.value)}
                  />
                  {m.label}
                </span>
                <span className="mt-1 block text-xs text-slate-400">{m.hint}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {mode === "replace" && (
          <p role="alert" className="mt-3 rounded-lg bg-red-950 px-3 py-2 text-sm font-bold text-red-300">
            Perhatian: mode Replace menghapus seluruh data lama sebelum mengisi data baru.
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-4 min-h-[44px] rounded-lg bg-amber-400 px-5 py-2 font-bold text-slate-950 disabled:opacity-50"
        >
          {loading ? "Memproses ETL…" : "Upload dan jalankan ETL"}
        </button>

        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-red-950 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
        {result && (
          <dl className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-slate-950 p-3 text-sm sm:grid-cols-4" aria-live="polite">
            <div><dt className="text-slate-400">Mode</dt><dd className="font-bold">{result.mode}</dd></div>
            <div><dt className="text-slate-400">Total baris</dt><dd className="font-bold">{result.total_rows}</dd></div>
            <div><dt className="text-slate-400">Valid</dt><dd className="font-bold">{result.valid_rows}</dd></div>
            <div><dt className="text-slate-400">Ditolak</dt><dd className="font-bold">{result.rejected_rows}</dd></div>
            <div><dt className="text-slate-400">Total di DB</dt><dd className="font-bold">{result.dataset_total}</dd></div>
            <div><dt className="text-slate-400">Status</dt><dd className="font-bold">{result.status}</dd></div>
          </dl>
        )}
      </form>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-4" aria-label="Daftar dataset">
        <h2 className="font-bold">Dataset di database</h2>
        {listError && <p role="alert" className="mt-2 text-sm text-red-400">{listError}</p>}
        {!listError && datasets.length === 0 && (
          <p className="mt-2 text-sm text-slate-400">Belum ada dataset tercatat.</p>
        )}
        <ul className="mt-3 grid gap-2">
          {datasets.map((d) => (
            <li key={d.dataset_id} className="rounded-lg border border-slate-700 px-3 py-2 text-sm">
              <p className="font-bold">{d.name} <span className="font-normal text-slate-400">({d.version}, {d.status})</span></p>
              <p className="text-slate-400">Total listing: {d.total_listings} — valid: {d.valid_rows}, ditolak: {d.rejected_rows}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
