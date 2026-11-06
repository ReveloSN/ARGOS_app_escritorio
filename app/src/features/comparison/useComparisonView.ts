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
  /** El minimapa de cambios vive en «Opciones» y empieza oculto. */
  readonly isMinimapShown: boolean;
  readonly setTab: (tab: CompareTab) => void;
  readonly setMinimapShown: (isShown: boolean) => void;
  readonly setFilters: (filters: ChangeFilters) => void;
  /** «Abrir el par» de la matriz: sus versiones, con el primer cambio elegido. */
  readonly openPair: (pairIndex: number) => void;
  /** Encabezado de la matriz: ese documento contra todos los demás. */
  readonly openAgainstAll: (document: string) => void;
}

function initialTab(comparison: ComparisonResult): CompareTab {
  return comparison.mode === "versions" ? "versions" : "matrix";
}

/** Los filtros y el minimapa: lo que «Opciones» cambia. */
function useDisplayOptions() {
  const [filters, setFilters] = useState<ChangeFilters>(DEFAULT_FILTERS);
  const [isMinimapShown, setMinimapShown] = useState(false);
  return { filters, isMinimapShown, setFilters, setMinimapShown };
}

/** Abrir un par o un documento contra todos: cambia el alcance y pasa a las versiones. */
function useOpeners(
  comparison: ComparisonResult,
  selection: ScopeSelection,
  setTab: (tab: CompareTab) => void,
) {
  const openVersions = (scope: CompareScope) => {
    selection.setScope(scope);
    setTab("versions");
  };
  const openPair = (index: number) => {
    const pair = comparison.pairs[index];
    if (pair) openVersions(againstDocument(pair.firstDocument, pair.secondDocument));
  };
  const openAgainstAll = (document: string) => {
    openVersions(againstAll(document));
  };
  return { openPair, openAgainstAll };
}

/** Lo que el usuario mira en Comparar; vuelve a empezar con cada comparación nueva. */
export function useComparisonView(comparison: ComparisonResult): ComparisonView {
  const [tab, setTab] = useState<CompareTab>(() => initialTab(comparison));
  const display = useDisplayOptions();
  const selection = useScopeSelection(comparison);
  const pairIndex = pairIndexOf(comparison, selection.scope, selection.selected);
  const openers = useOpeners(comparison, selection, setTab);
  return { ...selection, ...display, ...openers, tab, pairIndex, setTab };
}
