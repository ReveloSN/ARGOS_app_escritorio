import type { AlertResult, ReviewResult } from "../services/engine/reviewTypes";

/** Datos de ejemplo con la forma real de las respuestas del motor; solo para pruebas. */
export const CONTRACT_ALERT: AlertResult = {
  number: 1,
  risk: "high",
  entityType: "contract_id",
  differenceKind: "transposition",
  confidence: 0.95,
  highlightPositions: [2, 3],
  first: {
    value: "1234",
    normalizedValue: "1234",
    occurrences: [
      {
        document: "contrato.txt",
        location: { kind: "line", line: 1 },
        excerpt: "Contrato No. 1234",
      },
      {
        document: "acta.txt",
        location: { kind: "line", line: 4 },
        excerpt: "según el Contrato No. 1234",
      },
    ],
  },
  second: {
    value: "1324",
    normalizedValue: "1324",
    occurrences: [
      { document: "anexo.pdf", location: { kind: "page", page: 3 }, excerpt: "Contrato No. 1324" },
    ],
  },
};

export const NAME_ALERT: AlertResult = {
  number: 2,
  risk: "medium",
  entityType: "person_name",
  differenceKind: "similar_name",
  confidence: 0.8,
  highlightPositions: [],
  first: {
    value: "María Rojas Pérez",
    normalizedValue: "maria rojas perez",
    occurrences: [
      {
        document: "contrato.txt",
        location: { kind: "line", line: 9 },
        excerpt: "María Rojas Pérez",
      },
    ],
  },
  second: {
    value: "María Rojas Peña",
    normalizedValue: "maria rojas pena",
    occurrences: [
      { document: "anexo.pdf", location: { kind: "page", page: 6 }, excerpt: "María Rojas Peña" },
    ],
  },
};

export const REVIEW: ReviewResult = {
  session: {
    id: "s-1",
    name: "Revisión de prueba",
    createdAt: "2026-10-15T10:00:00+00:00",
    closedAt: null,
  },
  documents: [
    { name: "contrato.txt", status: "read", reason: null, fragmentCount: 2 },
    { name: "anexo.pdf", status: "read", reason: null, fragmentCount: 4 },
    { name: "escaneado.pdf", status: "unreadable", reason: "no_text", fragmentCount: 0 },
  ],
  alerts: [CONTRACT_ALERT, NAME_ALERT],
  decisions: { decisions: [], canUndo: false },
};

export const CLOSED_REVIEW: ReviewResult = {
  ...REVIEW,
  session: { ...REVIEW.session, closedAt: "2026-10-15T10:20:00+00:00" },
  decisions: {
    decisions: [
      {
        alertNumber: 1,
        kind: "error",
        correctSide: "first",
        decidedAt: "2026-10-15T10:10:00+00:00",
      },
    ],
    canUndo: false,
  },
};
