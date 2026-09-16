import { usePrediction } from "../hooks/usePrediction.js";
import { VehicleForm } from "../components/VehicleForm.jsx";
import { PredictionCard } from "../components/PredictionCard.jsx";
import { ShapWaterfall } from "../components/ShapWaterfall.jsx";
import { ShapBarChart } from "../components/ShapBarChart.jsx";
import { EmptyState, ErrorState, LoadingState } from "../components/LoadingState.jsx";

export function Prediction() {
  const { status, data, error, predict, reset } = usePrediction();

  return (
    <div className="page">
      <h1>Hitung estimasi</h1>
      <VehicleForm onSubmit={predict} loading={status === "loading"} />
      <div className="result-zone">
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
