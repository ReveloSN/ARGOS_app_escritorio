/** Comparaciones de prueba con la forma exacta que entrega el motor. */

import type {
  ChangeResult,
  ComparisonResult,
  PairComparisonResult,
  SegmentResult,
  WordEditResult,
} from "../services/engine/comparisonTypes";

export function segment(document: string, position: number, text: string): SegmentResult {
  return {
    position,
    kind: "paragraph",
    text,
    document,
    location: { kind: "paragraph", paragraph: position },
    span: { start: 0, end: text.length },
  };
}

export function replaced(first: [number, number, string], second: [number, number, string]) {
  const edit: WordEditResult = {
    kind: "replaced",
    first: { start: first[0], end: first[1] },
    second: { start: second[0], end: second[1] },
    firstText: first[2],
    secondText: second[2],
    characters: [],
  };
  return edit;
}

export const V2 = [
  segment("Contrato_v2.docx", 1, "Contrato No. 4857"),
  segment("Contrato_v2.docx", 2, "El arrendatario podrá ceder el contrato."),
  segment("Contrato_v2.docx", 3, "Seguros a cargo del arrendatario."),
];
export const V3 = [
  segment("Contrato_v3.docx", 1, "Contrato No. 4587"),
  segment("Contrato_v3.docx", 2, "Seguros a cargo del arrendatario."),
  segment("Contrato_v3.docx", 3, "El arrendatario no podrá ceder el contrato."),
  segment("Contrato_v3.docx", 4, "Cláusula penal por $ 5.000.000."),
];

export const NUMBER_CHANGE: ChangeResult = {
  number: 1,
  kind: "modified",
  risk: "high",
  materialities: ["number"],
  isMoved: false,
  first: V2[0] ?? null,
  second: V3[0] ?? null,
  edits: [replaced([13, 17, "4857"], [13, 17, "4587"])],
  meaning: { meaning: "meaning_change", confidence: 0.9 },
};
export const NEGATION_CHANGE: ChangeResult = {
  number: 2,
  kind: "modified",
  risk: "high",
  materialities: ["negation"],
  isMoved: false,
  first: V2[1] ?? null,
  second: V3[2] ?? null,
  edits: [
    {
      kind: "inserted",
      first: null,
      second: { start: 16, end: 18 },
      firstText: "",
      secondText: "no",
      characters: [],
    },
  ],
  meaning: { meaning: "meaning_change", confidence: 0.9 },
};
export const MOVED_CHANGE: ChangeResult = {
  number: 3,
  kind: "moved",
  risk: "low",
  materialities: [],
  isMoved: true,
  first: V2[2] ?? null,
  second: V3[1] ?? null,
  edits: [],
  meaning: null,
};
export const ADDED_CHANGE: ChangeResult = {
  number: 4,
  kind: "added",
  risk: "high",
  materialities: ["amount"],
  isMoved: false,
  first: null,
  second: V3[3] ?? null,
  edits: [],
  meaning: { meaning: "meaning_change", confidence: 0.7 },
};
export const CASE_CHANGE: ChangeResult = {
  ...NUMBER_CHANGE,
  number: 5,
  risk: "low",
  materialities: ["case"],
  meaning: { meaning: "reworded", confidence: 0.95 },
};

export const VERSION_CHANGES = [NUMBER_CHANGE, NEGATION_CHANGE, MOVED_CHANGE, ADDED_CHANGE];

export function pair(
  firstDocument: string,
  secondDocument: string,
  changes: readonly ChangeResult[] = [],
): PairComparisonResult {
  return {
    firstDocument,
    secondDocument,
    summary: {
      byKind: { added: 0, removed: 0, modified: 0, moved: 0 },
      byRisk: { high: 0, medium: 0, low: 0 },
    },
    changes,
    firstSegments: firstDocument === "Contrato_v2.docx" ? V2 : [],
    secondSegments: secondDocument === "Contrato_v3.docx" ? V3 : [],
    matchRatio: 1,
    seemsUnrelated: false,
  };
}

export function comparison(overrides: Partial<ComparisonResult> = {}): ComparisonResult {
  return {
    id: "c1",
    name: "Arrendamiento Fontibón",
    mode: "versions",
    createdAt: "2026-10-22T10:00:00+00:00",
    documents: [
      { name: "Contrato_v2.docx", status: "read", reason: null, fragmentCount: 3 },
      { name: "Contrato_v3.docx", status: "read", reason: null, fragmentCount: 4 },
    ],
    summary: pair("a", "b").summary,
    pairs: [pair("Contrato_v2.docx", "Contrato_v3.docx", VERSION_CHANGES)],
    inconsistencies: [],
    decisions: { decisions: [], canUndo: false },
    ...overrides,
  };
}
