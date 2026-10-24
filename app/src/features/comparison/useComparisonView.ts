import { useState } from "react";

import type { ComparisonResult } from "../../services/engine/comparisonTypes";
import { DEFAULT_FILTERS, type ChangeFilters } from "./changeFilters";
import { againstAll, againstDocument, pairIndexOf, type CompareScope } from "./comparisonScope";
import { useScopeSelection, type ScopeSelection } from "./useScopeSelection";

export type CompareTab = "versions" | "inconsistencies" | "matrix";

export interface ComparisonView extends ScopeSelection {
  readonly tab: CompareTab;
  /** El par que muestran los paneles: el del alcance, o el del cambio elegido en «contra todos». */
  readonly pairIndex: number;
  readonly filters: ChangeFilters;
  readonly setTab: (tab: CompareTab) => void;
  readonly setFilters: (filters: ChangeFilters) => void;
  /** «Abrir el par» de la matriz: sus versiones, con el primer cambio elegido. */
  readonly openPair: (pairIndex: number) => void;
  /** Encabezado de la matriz: ese documento contra todos los demás. */
  readonly openAgainstAll: (document: string) => void;
}

function initialTab(comparison: ComparisonResult): CompareTab {
  return comparison.mode === "versions" ? "versions" : "matrix";
}

/** Lo que el usuario mira en Comparar; vuelve a empezar con cada comparación nueva. */
export function useComparisonView(comparison: ComparisonResult): ComparisonView {
  const [tab, setTab] = useState<CompareTab>(() => initialTab(comparison));
  const [filters, setFilters] = useState<ChangeFilters>(DEFAULT_FILTERS);
  const selection = useScopeSelection(comparison);
  const openVersions = (scope: CompareScope) => {
    selection.setScope(scope);
    setTab("versions");
  };
  const openPair = (index: number) => {
    const pair = comparison.pairs[index];
    if (pair) openVersions(againstDocument(pair.firstDocument, pair.secondDocument));
  };
  const pairIndex = pairIndexOf(comparison, selection.scope, selection.selected);
  const openAgainstAll = (document: string) => {
    openVersions(againstAll(document));
  };
  return { ...selection, tab, pairIndex, filters, setTab, setFilters, openPair, openAgainstAll };
}
