import { useState } from "react";

import type { ComparisonResult } from "../../services/engine/comparisonTypes";
import { DEFAULT_FILTERS, type ChangeFilters } from "./changeFilters";

export type CompareTab = "versions" | "inconsistencies" | "matrix";

export interface ComparisonView {
  readonly tab: CompareTab;
  readonly pairIndex: number;
  /** Número del cambio o de la inconsistencia elegida. */
  readonly selected: number | undefined;
  readonly filters: ChangeFilters;
  readonly setTab: (tab: CompareTab) => void;
  readonly setPairIndex: (pairIndex: number) => void;
  readonly select: (number: number | undefined) => void;
  readonly setFilters: (filters: ChangeFilters) => void;
  /** «Abrir el par» de la matriz: sus versiones, con el primer cambio elegido. */
  readonly openPair: (pairIndex: number) => void;
}

function initialTab(comparison: ComparisonResult): CompareTab {
  return comparison.mode === "versions" ? "versions" : "matrix";
}

/** Lo que el usuario mira en Comparar; vuelve a empezar con cada comparación nueva. */
export function useComparisonView(comparison: ComparisonResult): ComparisonView {
  const [tab, setTab] = useState<CompareTab>(() => initialTab(comparison));
  const [pairIndex, setPairIndex] = useState(0);
  const [selected, select] = useState<number | undefined>(comparison.pairs[0]?.changes[0]?.number);
  const [filters, setFilters] = useState<ChangeFilters>(DEFAULT_FILTERS);
  const openPair = (index: number) => {
    setPairIndex(index);
    select(comparison.pairs[index]?.changes[0]?.number);
    setTab("versions");
  };
  return { tab, pairIndex, selected, filters, setTab, setPairIndex, select, setFilters, openPair };
}
