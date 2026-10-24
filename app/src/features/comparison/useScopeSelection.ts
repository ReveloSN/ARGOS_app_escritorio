import { useState } from "react";

import type { ComparisonResult } from "../../services/engine/comparisonTypes";
import { initialScope, scopedChanges, type CompareScope } from "./comparisonScope";

export interface ScopeSelection {
  readonly scope: CompareScope;
  /** Número del cambio o de la inconsistencia elegida. */
  readonly selected: number | undefined;
  /** En «contra todos», filtra la lista a los cambios contra un solo documento. */
  readonly documentFilter: string | undefined;
  readonly setScope: (scope: CompareScope) => void;
  readonly select: (number: number | undefined) => void;
  readonly setDocumentFilter: (document: string | undefined) => void;
}

function firstChangeNumber(comparison: ComparisonResult, scope: CompareScope): number | undefined {
  return scopedChanges(comparison, scope)[0]?.change.number;
}

/** Documento base, contra qué se compara y el cambio elegido; cambiar el alcance reinicia lo demás. */
export function useScopeSelection(comparison: ComparisonResult): ScopeSelection {
  const [scope, setScopeOnly] = useState(() => initialScope(comparison));
  const [selected, select] = useState<number | undefined>(() =>
    firstChangeNumber(comparison, initialScope(comparison)),
  );
  const [documentFilter, setDocumentFilter] = useState<string | undefined>(undefined);
  const setScope = (next: CompareScope) => {
    setScopeOnly(next);
    setDocumentFilter(undefined);
    select(firstChangeNumber(comparison, next));
  };
  return { scope, selected, documentFilter, setScope, select, setDocumentFilter };
}
