import type {
  ChangeKindValue,
  ChangeResult,
  ComparisonResult,
  PairComparisonResult,
} from "../../services/engine/comparisonTypes";
import { countByKind } from "./changeFilters";
import { comparedDocuments } from "./comparisonMatrix";

/** Contra qué se compara el documento base: todos los demás o uno concreto. */
export type Against =
  { readonly kind: "all" } | { readonly kind: "document"; readonly name: string };

export interface CompareScope {
  readonly base: string;
  readonly against: Against;
}

/** Un cambio del alcance, con el par del que sale y el documento contra el que se compara. */
export interface ScopedChange {
  readonly change: ChangeResult;
  readonly pairIndex: number;
  readonly other: string;
}

export interface DocumentChangeCounts {
  readonly document: string;
  readonly counts: Readonly<Record<ChangeKindValue, number>>;
}

export const comparedDocumentNames = comparedDocuments;

export function againstAll(base: string): CompareScope {
  return { base, against: { kind: "all" } };
}

export function againstDocument(base: string, name: string): CompareScope {
  return { base, against: { kind: "document", name } };
}

/** El documento con el que `base` se compara en este par, o null si el par no lo incluye. */
function counterpart(pair: PairComparisonResult, base: string): string | null {
  if (pair.firstDocument === base) return pair.secondDocument;
  return pair.secondDocument === base ? pair.firstDocument : null;
}

function isInScope(pair: PairComparisonResult, scope: CompareScope): boolean {
  const other = counterpart(pair, scope.base);
  if (other === null) return false;
  return scope.against.kind === "all" || scope.against.name === other;
}

export function otherDocuments(comparison: ComparisonResult, base: string): string[] {
  return comparedDocuments(comparison).filter((name) => name !== base);
}

/** Al abrir: el primer par, como siempre; desde ahí el usuario elige base y contra qué. */
export function initialScope(comparison: ComparisonResult): CompareScope {
  const first = comparison.pairs[0];
  return first ? againstDocument(first.firstDocument, first.secondDocument) : againstAll("");
}

/**
 * Los cambios del alcance: se componen con los pares que el motor ya comparó (el mismo
 * comparador de pares), sin recalcular ninguna diferencia.
 */
export function scopedChanges(comparison: ComparisonResult, scope: CompareScope): ScopedChange[] {
  return comparison.pairs.flatMap((pair, pairIndex) => {
    const other = counterpart(pair, scope.base);
    if (other === null || !isInScope(pair, scope)) return [];
    return pair.changes.map((change) => ({ change, pairIndex, other }));
  });
}

/** El par que muestran los paneles: el del alcance concreto o el del cambio elegido. */
export function pairIndexOf(
  comparison: ComparisonResult,
  scope: CompareScope,
  selected?: number,
): number {
  const inScope = comparison.pairs.flatMap((pair, index) =>
    isInScope(pair, scope) ? [index] : [],
  );
  const ofSelected = scopedChanges(comparison, scope).find(
    (item) => item.change.number === selected,
  );
  return ofSelected?.pairIndex ?? inScope[0] ?? 0;
}

/** Los documentos contra los que se compara el base dentro del alcance, en orden de carga. */
export function scopeDocuments(comparison: ComparisonResult, scope: CompareScope): string[] {
  return otherDocuments(comparison, scope.base).filter(
    (name) => scope.against.kind === "all" || scope.against.name === name,
  );
}

/** Cuántos cambios de cada tipo hay contra cada documento (también los que no tienen ninguno). */
export function changeCountsByDocument(
  comparison: ComparisonResult,
  scope: CompareScope,
  scoped: readonly ScopedChange[],
): DocumentChangeCounts[] {
  return scopeDocuments(comparison, scope).map((document) => ({
    document,
    counts: countByKind(scoped.filter((item) => item.other === document).map((i) => i.change)),
  }));
}
