import { usePrediction } from "../hooks/usePrediction.js";
import { VehicleForm } from "../components/VehicleForm.jsx";
import { PredictionCard } from "../components/PredictionCard.jsx";
import { ShapWaterfall } from "../components/ShapWaterfall.jsx";
import { ShapBarChart } from "../components/ShapBarChart.jsx";
import { EmptyState, ErrorState, LoadingState } from "../components/LoadingState.jsx";

export function Prediction() {
  const { status, data, error, predict, reset } = usePrediction();

  return (
    <div className="prediction-page mx-auto max-w-6xl">
      <div className="prediction-heading">
        <span className="eyebrow">Vehicle profile</span>
        <h1 className="mb-2 mt-3 text-3xl font-bold leading-tight sm:text-5xl">Hitung estimasi mobil.</h1>
        <p className="max-w-[38rem] text-muted">Isi detail yang tersedia. Setelah dihitung, setiap perubahan estimasi dapat ditelusuri melalui penjelasan SHAP.</p>
      </div>
      <div className="prediction-layout mt-8">
        <section className="form-panel rounded-2xl border border-line bg-white p-5 sm:p-8" aria-label="Input kendaraan">
          <div className="mb-2 flex items-center justify-between gap-4"><h2 className="text-xl font-bold">Detail kendaraan</h2><span className="eyebrow">01 / 01</span></div>
          <VehicleForm onSubmit={predict} loading={status === "loading"} />
        </section>
        <aside className="prediction-note"><span className="eyebrow">What you get</span><h2 className="mt-2 text-xl font-bold">Bukan hanya satu angka.</h2><p className="mt-3 text-sm leading-relaxed text-muted">Model memberi estimasi dan alasan di baliknya, supaya hasilnya bisa dibaca dan dipertanyakan.</p><div className="note-rule" /><p className="text-sm font-bold">Output: IDR + SHAP local explanation</p></aside>
      </div>
      <div className="mt-8">
        {status === "idle" && <EmptyState />}
        {status === "loading" && <LoadingState />}
        {status === "error" && <ErrorState message={error} onRetry={reset} />}
        {status === "success" && data && (
          <>
            <PredictionCard data={data} onReset={reset} />
            <ShapWaterfall explanation={data.explanation} predictedPrice={data.predicted_price} />
            <ShapBarChart explanation={data.explanation} />
          </>
        )}
      </div>
    </div>
  );
}
