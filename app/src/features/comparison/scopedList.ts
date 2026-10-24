import type { ChangeResult, ComparisonResult } from "../../services/engine/comparisonTypes";
import { isHiddenByIgnore, visibleChanges, type ChangeFilters } from "./changeFilters";
import { scopedChanges, type CompareScope, type ScopedChange } from "./comparisonScope";

export interface ScopedListInput {
  readonly scope: CompareScope;
  readonly filters: ChangeFilters;
  readonly documentFilter: string | undefined;
  readonly pairIndex: number;
  readonly selected: number | undefined;
}

/** Lo que muestra la vista de versiones para el alcance elegido, ya con todos los filtros. */
export interface ScopedList {
  /** Los cambios del alcance después de ignorar los de forma (contadores y desglose). */
  readonly shown: readonly ScopedChange[];
  /** La lista visible: además del documento, «solo importantes» y el tipo. */
  readonly visible: readonly ChangeResult[];
  /** Los cambios del par que muestran los paneles. */
  readonly pairChanges: readonly ChangeResult[];
  /** Número de cambio → documento contra el que ocurre. */
  readonly againstByChange: ReadonlyMap<number, string>;
  readonly selected: ChangeResult | undefined;
}

export function scopedList(comparison: ComparisonResult, input: ScopedListInput): ScopedList {
  const shown = scopedChanges(comparison, input.scope).filter(
    (item) => !isHiddenByIgnore(item.change, input.filters.ignored),
  );
  const ofDocument = shown.filter(
    (item) => input.documentFilter === undefined || item.other === input.documentFilter,
  );
  return {
    shown,
    visible: visibleChanges(
      ofDocument.map((item) => item.change),
      input.filters,
    ),
    pairChanges: shown.filter((item) => item.pairIndex === input.pairIndex).map((i) => i.change),
    againstByChange: new Map(shown.map((item) => [item.change.number, item.other])),
    selected: shown.find((item) => item.change.number === input.selected)?.change,
  };
}
