import { useEffect, useState } from "react";
import { listEtlJobs } from "../../services/api.js";

export function DevEtl() {
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    listEtlJobs().then((d) => setJobs(d.jobs ?? [])).catch((e) => setError(e.message));
  }, []);

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl font-bold">ETL Management</h1>
        <p className="mt-1 text-sm text-slate-400">Riwayat eksekusi ETL: mode Update/Replace, hasil validasi, dan status tiap job.</p>
      </div>
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      {jobs.length === 0 && !error && (
        <p className="text-sm text-slate-400">Belum ada ETL job. Jalankan upload dari modul Datasets.</p>
      )}
      {jobs.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="bg-slate-900 text-slate-400">
                <th className="px-3 py-2">File</th>
                <th className="px-3 py-2">Mode</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Valid</th>
                <th className="px-3 py-2">Ditolak</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.etl_job_id} className="border-t border-slate-800 bg-slate-950">
                  <td className="px-3 py-2">{j.filename}</td>
                  <td className="px-3 py-2">{j.mode}</td>
                  <td className="px-3 py-2">{j.status}</td>
                  <td className="px-3 py-2">{j.total_rows}</td>
                  <td className="px-3 py-2">{j.valid_rows}</td>
                  <td className="px-3 py-2">{j.rejected_rows}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
