import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { DeveloperShell } from "../layouts/DeveloperShell.jsx";
import { devRoute } from "./devNav.js";
import "../styles.css";

// Entry khusus Developer Portal: hanya me-render DeveloperShell.
// Tidak ada kode/rute User Portal di bundle ini.
function DeveloperApp() {
  const [, force] = useState(0);

  useEffect(() => {
    const onHash = () => force((n) => n + 1);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return <DeveloperShell section={devRoute()} />;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <DeveloperApp />
  </StrictMode>
);
