import { createContext, useContext } from "react";

import type { AlertFilters } from "./alertFilters";

export type ResultsTab = "alerts" | "files" | "decisions";

/** Cómo dejó el usuario la vista de Resultados: se conserva al ir al detalle y volver. */
export interface ResultsViewState {
  readonly tab: ResultsTab;
  readonly filters: AlertFilters;
  readonly selectedNumber: number | null;
  readonly setTab: (tab: ResultsTab) => void;
  readonly setFilters: (filters: AlertFilters) => void;
  readonly select: (number: number | null) => void;
}

export const ResultsViewContext = createContext<ResultsViewState | null>(null);

export function useResultsView(): ResultsViewState {
  const state = useContext(ResultsViewContext);
  if (!state) throw new Error("Falta ResultsViewProvider dentro de ReviewProvider.");
  return state;
}
