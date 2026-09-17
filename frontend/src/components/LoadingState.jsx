export function LoadingState({ what = "hasil estimasi" }) {
  return (
    <div role="status" aria-label={`Memuat ${what}`}
      className="rounded-[10px] border-[1.5px] border-dashed border-line p-6 text-muted">
      <div aria-hidden="true" className="mb-3 grid gap-2">
        <span className="block h-4 rounded bg-line"></span>
        <span className="block h-4 w-[70%] rounded bg-line"></span>
        <span className="block h-4 w-[45%] rounded bg-line"></span>
      </div>
      <p>Memuat {what}...</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div role="alert" className="rounded-[10px] border-[1.5px] border-solid border-rust p-6 text-muted">
      <p className="mb-1 font-bold text-ink">Estimasi gagal dibuat</p>
      <p>{message}</p>
      <button type="button" className="btn-secondary" onClick={onRetry}>Coba lagi</button>
    </div>
  );
}

export function EmptyState() {
  return (
    <div className="rounded-[10px] border-[1.5px] border-dashed border-line p-6 text-muted">
      <p className="mb-1 font-bold text-ink">Belum ada estimasi</p>
      <p>Isi formulir kendaraan, lalu tekan Hitung estimasi. Hasil dan penjelasannya tampil di sini.</p>
    </div>
  );
}
