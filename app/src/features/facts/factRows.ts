import type { FactResult, FactsResult, PendingFactResult } from "../../services/engine/factTypes";
import type { RiskLevelValue } from "../../services/engine/reviewTypes";

export type FactFilter = "all" | "contradicted" | "pending";

export const FACT_FILTERS: readonly FactFilter[] = ["all", "contradicted", "pending"];

/** Una fila de «Datos confirmados»: un dato del expediente o uno que falta confirmar. */
export type FactRow =
  | { readonly kind: "fact"; readonly key: string; readonly fact: FactResult }
  | { readonly kind: "pending"; readonly key: string; readonly pending: PendingFactResult };

export function factRows(result: FactsResult): FactRow[] {
  const facts = result.facts.map((fact): FactRow => ({
    kind: "fact",
    key: `f${String(fact.id)}`,
    fact,
  }));
  // La clave sale del contenido: al confirmar uno, los demás pendientes conservan la suya.
  const pending = result.pending.map((item): FactRow => ({
    kind: "pending",
    key: `p:${item.entityType}:${item.values.join("|")}`,
    pending: item,
  }));
  return [...facts, ...pending];
}

export function isRetired(fact: FactResult): boolean {
  return fact.retiredAt !== null;
}

/** El motor ya no compara un dato retirado: no tiene contradicciones vigentes. */
export function isContradicted(fact: FactResult): boolean {
  return !isRetired(fact) && fact.contradictions.length > 0;
}

/** El riesgo más alto entre lo que lo contradice (el motor los ordena de mayor a menor). */
export function topRisk(fact: FactResult): RiskLevelValue | null {
  return fact.contradictions[0]?.risk ?? null;
}

const MATCHES_FILTER: Readonly<Record<FactFilter, (row: FactRow) => boolean>> = {
  all: () => true,
  contradicted: (row) => row.kind === "fact" && isContradicted(row.fact),
  pending: (row) => row.kind === "pending",
};

export function filterRows(rows: readonly FactRow[], filter: FactFilter): FactRow[] {
  return rows.filter(MATCHES_FILTER[filter]);
}

export function filterCounts(rows: readonly FactRow[]): Readonly<Record<FactFilter, number>> {
  return {
    all: rows.length,
    contradicted: filterRows(rows, "contradicted").length,
    pending: filterRows(rows, "pending").length,
  };
}

/** Los documentos distintos donde aparece el valor confirmado. */
export function appearanceDocuments(fact: FactResult): string[] {
  return [...new Set(fact.appearances.map((item) => item.document))];
}
