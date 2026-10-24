/** Comparaciones de prueba con la forma exacta que entrega el motor. */

import type { DocumentReadResult } from "../services/engine/reviewTypes";
import type {
  ChangeResult,
  ComparisonResult,
  PairComparisonResult,
} from "../services/engine/comparisonTypes";
import { replaced, V2, V3 } from "./comparisonSegments";

export { replaced, segment, V2, V3 } from "./comparisonSegments";

export const NUMBER_CHANGE: ChangeResult = {
  number: 1,
  kind: "modified",
  risk: "high",
  materialities: ["number"],
  isMoved: false,
  topic: "number",
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
  topic: "negation",
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
  topic: "moved",
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
  topic: "amount",
  first: null,
  second: V3[3] ?? null,
  edits: [],
  meaning: { meaning: "meaning_change", confidence: 0.7 },
};
export const REMOVED_ANNEX_CHANGE: ChangeResult = {
  number: 3,
  kind: "removed",
  risk: "medium",
  materialities: [],
  isMoved: false,
  topic: "removed",
  first: V2[2] ?? null,
  second: null,
  edits: [],
  meaning: null,
};
export const CASE_CHANGE: ChangeResult = {
  ...NUMBER_CHANGE,
  number: 5,
  risk: "low",
  materialities: ["case"],
  topic: "case",
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

function readDocument(name: string, fragmentCount: number): DocumentReadResult {
  return { name, status: "read", reason: null, fragmentCount, method: "text", pageCount: null };
}

export function comparison(overrides: Partial<ComparisonResult> = {}): ComparisonResult {
  return {
    id: "c1",
    name: "Arrendamiento Fontibón",
    mode: "versions",
    createdAt: "2026-10-22T10:00:00+00:00",
    documents: [readDocument("Contrato_v2.docx", 3), readDocument("Contrato_v3.docx", 4)],
    summary: pair("a", "b").summary,
    pairs: [pair("Contrato_v2.docx", "Contrato_v3.docx", VERSION_CHANGES)],
    inconsistencies: [],
    decisions: { decisions: [], canUndo: false },
    ...overrides,
  };
}
