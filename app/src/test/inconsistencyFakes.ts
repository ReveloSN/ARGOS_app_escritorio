/** Inconsistencias de prueba: el número de contrato distinto entre tres documentos. */

import type { AlertSideResult, AlertResult } from "../services/engine/reviewTypes";

const CONTRACT_A: AlertSideResult = {
  value: "4857",
  normalizedValue: "4857",
  occurrences: [
    { document: "Contrato_v2.docx", location: { kind: "page", page: 1 }, excerpt: "No. 4857" },
    {
      document: "Anexo.xlsx",
      location: { kind: "sheet_cell", sheet: "Resumen", cell: "A2" },
      excerpt: "4857",
    },
  ],
};

const CONTRACT_B: AlertSideResult = {
  value: "4587",
  normalizedValue: "4587",
  occurrences: [
    { document: "Contrato_v3.docx", location: { kind: "page", page: 1 }, excerpt: "No. 4587" },
  ],
};

export function inconsistency(number: number): AlertResult {
  return {
    number,
    risk: "high",
    entityType: "contract_id",
    differenceKind: "transposition",
    confidence: 0.95,
    highlightPositions: [1, 2],
    first: CONTRACT_A,
    second: CONTRACT_B,
    explanation: [],
  };
}
