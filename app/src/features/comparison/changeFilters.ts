import type {
  ChangeKindValue,
  ChangeResult,
  MaterialityValue,
} from "../../services/engine/comparisonTypes";

export type ChangeTypeFilter = "all" | ChangeKindValue;
/** Cambios de forma que la pantalla permite ocultar (mayúsculas, puntuación, formato). */
export type CosmeticMateriality = "case" | "punctuation" | "format";

export interface ChangeFilters {
  readonly type: ChangeTypeFilter;
  readonly isImportantOnly: boolean;
  readonly ignored: ReadonlySet<CosmeticMateriality>;
}

export const CHANGE_KINDS: readonly ChangeKindValue[] = ["removed", "added", "modified", "moved"];
export const COSMETIC_MATERIALITIES: readonly CosmeticMateriality[] = [
  "case",
  "punctuation",
  "format",
];

// Mockup: «Ignorar formato» viene marcado; mayúsculas y puntuación se ven.
export const DEFAULT_FILTERS: ChangeFilters = {
  type: "all",
  isImportantOnly: false,
  ignored: new Set<CosmeticMateriality>(["format"]),
};

// «Solo cambios importantes»: números, fechas, nombres y negaciones (los montos son números).
const IMPORTANT: ReadonlySet<MaterialityValue> = new Set<MaterialityValue>([
  "amount",
  "number",
  "date",
  "party",
  "negation",
]);

export function isHiddenByIgnore(
  change: ChangeResult,
  ignored: ReadonlySet<CosmeticMateriality>,
): boolean {
  return change.materialities.some((materiality) =>
    ignored.has(materiality as CosmeticMateriality),
  );
}

export function isImportant(change: ChangeResult): boolean {
  return change.materialities.some((materiality) => IMPORTANT.has(materiality));
}

/** Los cambios que siguen visibles después de ignorar los de forma (contadores y minimapa). */
export function shownChanges(
  changes: readonly ChangeResult[],
  ignored: ReadonlySet<CosmeticMateriality>,
): ChangeResult[] {
  return changes.filter((change) => !isHiddenByIgnore(change, ignored));
}

/** La lista de cambios con todos los filtros: ignorados, importantes y tipo. */
export function visibleChanges(
  changes: readonly ChangeResult[],
  filters: ChangeFilters,
): ChangeResult[] {
  return shownChanges(changes, filters.ignored).filter(
    (change) =>
      (!filters.isImportantOnly || isImportant(change)) &&
      (filters.type === "all" || change.kind === filters.type),
  );
}

export function countByKind(changes: readonly ChangeResult[]): Record<ChangeKindValue, number> {
  const counts: Record<ChangeKindValue, number> = { removed: 0, added: 0, modified: 0, moved: 0 };
  changes.forEach((change) => {
    counts[change.kind] += 1;
  });
  return counts;
}
