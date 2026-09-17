import { Home } from "../pages/Home.jsx";
import { Prediction } from "../pages/Prediction.jsx";
import { DataDashboard } from "../pages/DataDashboard.jsx";

export function PageContent({ page }) {
  if (page === "prediksi") return <Prediction />;
  if (page === "data") return <DataDashboard />;
  return <Home />;
}
