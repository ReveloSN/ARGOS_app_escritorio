import type { ContradictionResult, FactResult, FactsResult } from "../services/engine/factTypes";
import type { OccurrenceResult } from "../services/engine/reviewTypes";

/** Datos del expediente 2026-118 de los mockups, como los devuelve el motor. */
const IN_CONTRACT: OccurrenceResult = {
  document: "Contrato_4857_v3.docx",
  location: { kind: "page", page: 1 },
  excerpt: "Contrato No. 4857",
};

const ANNEX_CONTRADICTION: ContradictionResult = {
  value: "4587",
  risk: "high",
  differenceKind: "transposition",
  occurrences: [
    {
      document: "Anexo_1_condiciones.pdf",
      location: { kind: "page", page: 1 },
      excerpt: "Contrato No. 4587",
    },
  ],
};

export function confirmedFact(overrides: Partial<FactResult> = {}): FactResult {
  return {
    id: 1,
    label: "Número de contrato",
    entityType: "contract_id",
    value: "4857",
    confirmedAt: "2026-09-14T10:00:00+00:00",
    retiredAt: null,
    appearances: [IN_CONTRACT],
    variants: [],
    contradictions: [ANNEX_CONTRADICTION],
    accepted: [],
    ...overrides,
  };
}

export function factsResult(overrides: Partial<FactsResult> = {}): FactsResult {
  return {
    facts: [confirmedFact()],
    pending: [{ entityType: "money", values: ["$ 18.450.000", "$ 18.540.000"] }],
    canUndo: false,
    ...overrides,
  };
}
