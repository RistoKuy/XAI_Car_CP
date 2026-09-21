import { usePrediction } from "../../hooks/usePrediction.js";
import { VehicleForm } from "../../components/VehicleForm.jsx";
import { PredictionCard } from "../../components/PredictionCard.jsx";
import { ShapWaterfall } from "../../components/ShapWaterfall.jsx";
import { ShapBarChart } from "../../components/ShapBarChart.jsx";
import { EmptyState, ErrorState, LoadingState } from "../../components/LoadingState.jsx";

export function DevPlayground() {
  const { status, data, error, predict, reset } = usePrediction();

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl font-bold">Prediction Playground</h1>
        <p className="mt-1 text-sm text-slate-400">Uji endpoint prediksi + SHAP memakai model aktif, tanpa menyentuh User Portal.</p>
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <VehicleForm onSubmit={predict} loading={status === "loading"} />
      </div>
      <div>
        {status === "idle" && <EmptyState />}
        {status === "loading" && <LoadingState />}
        {status === "error" && <ErrorState message={error} onRetry={reset} />}
        {status === "success" && data && (
          <>
            <PredictionCard data={data} onReset={reset} />
            <div className="mt-4 grid gap-4">
              <ShapWaterfall explanation={data.explanation} predictedPrice={data.predicted_price} />
              <ShapBarChart explanation={data.explanation} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
