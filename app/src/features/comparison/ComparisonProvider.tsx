import { useMemo, useState, type ReactNode } from "react";

import type { ComparisonResult } from "../../services/engine/comparisonTypes";
import { ComparisonContext, type ComparisonState } from "./comparisonContext";

// Sin comparación al iniciar: la pantalla Comparar empieza vacía y pide elegir documentos.
export function ComparisonProvider({ children }: { readonly children: ReactNode }) {
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const state = useMemo<ComparisonState>(
    () => ({
      comparison,
      showComparison: setComparison,
      discardComparison: () => {
        setComparison(null);
      },
      updateDecisions: (decisions) => {
        setComparison((current) => current && { ...current, decisions });
      },
    }),
    [comparison],
  );
  return <ComparisonContext.Provider value={state}>{children}</ComparisonContext.Provider>;
}
