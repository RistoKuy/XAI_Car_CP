export const DEV_NAV = [
  { href: "#/developer", key: "overview", label: "Overview" },
  { href: "#/developer/datasets", key: "datasets", label: "Datasets" },
  { href: "#/developer/etl", key: "etl", label: "ETL" },
  { href: "#/developer/models", key: "models", label: "Models" },
  { href: "#/developer/playground", key: "playground", label: "Playground" },
  { href: "#/developer/api", key: "api", label: "API Explorer" },
];

export function devRoute() {
  const h = window.location.hash || "#/developer";
  const rest = h.replace(/^#\/developer\/?/, "").split("?")[0];
  const key = rest.split("/")[0];
  return DEV_NAV.some((n) => n.key === key && key !== "overview") ? key : "overview";
}
