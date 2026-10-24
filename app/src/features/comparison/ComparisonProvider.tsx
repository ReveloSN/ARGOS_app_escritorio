import { useMemo, useState, type ReactNode } from "react";

import type { ComparisonResult } from "../../services/engine/comparisonTypes";
import { ComparisonContext, type ComparisonState } from "./comparisonContext";

// Cuántas comparaciones cerradas se recuerdan para volver a abrirlas.
const RECENT_LIMIT = 5;

function without(list: readonly ComparisonResult[], id: string): ComparisonResult[] {
  return list.filter((item) => item.id !== id);
}

// Sin comparación al iniciar: la pantalla Comparar empieza vacía y pide elegir documentos.
export function ComparisonProvider({ children }: { readonly children: ReactNode }) {
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [recent, setRecent] = useState<readonly ComparisonResult[]>([]);
  const state = useMemo<ComparisonState>(
    () => ({
      comparison,
      recent,
      showComparison: (shown) => {
        setRecent((list) => without(list, shown.id));
        setComparison(shown);
      },
      closeComparison: () => {
        if (!comparison) return;
        setRecent((list) => [comparison, ...without(list, comparison.id)].slice(0, RECENT_LIMIT));
        setComparison(null);
      },
      discardComparison: () => {
        setComparison(null);
        setRecent([]);
      },
      updateDecisions: (decisions) => {
        setComparison((current) => current && { ...current, decisions });
      },
    }),
    [comparison, recent],
  );
  return <ComparisonContext.Provider value={state}>{children}</ComparisonContext.Provider>;
}
