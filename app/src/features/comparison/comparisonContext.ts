import { createContext, useContext } from "react";

import type { ComparisonResult } from "../../services/engine/comparisonTypes";
import type { DecisionsResult } from "../../services/engine/reviewTypes";

/** Comparación actual: solo existe después de que el motor devuelve resultados reales. */
export interface ComparisonState {
  readonly comparison: ComparisonResult | null;
  readonly showComparison: (comparison: ComparisonResult) => void;
  readonly discardComparison: () => void;
  readonly updateDecisions: (decisions: DecisionsResult) => void;
}

export const ComparisonContext = createContext<ComparisonState | null>(null);

export function useComparison(): ComparisonState {
  const state = useContext(ComparisonContext);
  if (!state) throw new Error("Falta ComparisonProvider en la raíz de la app.");
  return state;
}
