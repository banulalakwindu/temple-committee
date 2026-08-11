import { useEffect, useState } from "react";

export type TableDensity = "comfortable" | "compact";

const STORAGE_KEY = "temple_table_density";

function readDensity(): TableDensity {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "compact" ? "compact" : "comfortable";
  } catch {
    return "comfortable";
  }
}

function applyDensity(density: TableDensity) {
  document.documentElement.dataset.tableDensity = density;
}

/** Keep tables compact/comfortable across the app. */
export function useTableDensity() {
  const [density, setDensityState] = useState<TableDensity>(() => readDensity());

  useEffect(() => {
    applyDensity(density);
  }, [density]);

  const setDensity = (next: TableDensity) => {
    setDensityState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  };

  return { density, setDensity };
}

/** Call once at app root so density applies even before Settings opens. */
export function TableDensityBoot() {
  useTableDensity();
  return null;
}
