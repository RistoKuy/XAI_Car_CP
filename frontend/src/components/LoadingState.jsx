export function LoadingState({ what = "hasil estimasi" }) {
  return (
    <div className="state-block" role="status" aria-label={`Memuat ${what}`}>
      <div className="skeleton" aria-hidden="true">
        <span></span><span></span><span></span>
      </div>
      <p>Memuat {what}...</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="state-block error-block" role="alert">
      <p className="state-title">Estimasi gagal dibuat</p>
      <p>{message}</p>
      <button type="button" className="secondary" onClick={onRetry}>Coba lagi</button>
    </div>
  );
}

export function EmptyState() {
  return (
    <div className="state-block">
      <p className="state-title">Belum ada estimasi</p>
      <p>Isi formulir kendaraan, lalu tekan Hitung estimasi. Hasil dan penjelasannya tampil di sini.</p>
    </div>
  );
}
