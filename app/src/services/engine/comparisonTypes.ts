/** Comparación tal como la entrega el motor (engine/argus/api/schemas/comparison.py). */

import type {
  AlertResult,
  DecisionInput,
  DecisionsResult,
  DocumentReadResult,
  ReviewProgressEvent,
  RiskLevelValue,
  SourceLocationResult,
} from "./reviewTypes";

export type ComparisonModeValue =
  "versions" | "email_attachment" | "contract_annexes" | "one_to_many";
export type ChangeKindValue = "added" | "removed" | "modified" | "moved";
export type MaterialityValue =
  | "amount"
  | "date"
  | "number"
  | "party"
  | "negation"
  | "wording"
  | "case"
  | "punctuation"
  | "format";
export type EditKindValue = "inserted" | "deleted" | "replaced";
export type SegmentKindValue = "paragraph" | "clause" | "table_row";

export interface TextSpanResult {
  readonly start: number;
  readonly end: number;
}

export interface SegmentResult {
  readonly position: number;
  readonly kind: SegmentKindValue;
  readonly text: string;
  readonly document: string;
  readonly location: SourceLocationResult;
  readonly span: TextSpanResult | null;
}

export interface CharacterEditResult {
  readonly kind: EditKindValue;
  readonly first: TextSpanResult | null;
  readonly second: TextSpanResult | null;
}

export interface WordEditResult {
  readonly kind: EditKindValue;
  /** Tramos sobre el texto de cada segmento. */
  readonly first: TextSpanResult | null;
  readonly second: TextSpanResult | null;
  readonly firstText: string;
  readonly secondText: string;
  readonly characters: readonly CharacterEditResult[];
}

export interface ChangeResult {
  /** Número en toda la comparación; las inconsistencias siguen al último cambio. */
  readonly number: number;
  readonly kind: ChangeKindValue;
  readonly risk: RiskLevelValue;
  readonly materialities: readonly MaterialityValue[];
  readonly isMoved: boolean;
  readonly first: SegmentResult | null;
  readonly second: SegmentResult | null;
  readonly edits: readonly WordEditResult[];
}

export interface ChangeSummaryResult {
  readonly byKind: Readonly<Record<ChangeKindValue, number>>;
  readonly byRisk: Readonly<Record<RiskLevelValue, number>>;
}

export interface PairComparisonResult {
  readonly firstDocument: string;
  readonly secondDocument: string;
  readonly summary: ChangeSummaryResult;
  readonly changes: readonly ChangeResult[];
  readonly firstSegments: readonly SegmentResult[];
  readonly secondSegments: readonly SegmentResult[];
  readonly matchRatio: number;
  /** Coinciden menos del 20 % del texto: parecen documentos distintos. */
  readonly seemsUnrelated: boolean;
}

export interface ComparisonResult {
  readonly id: string;
  readonly name: string;
  readonly mode: ComparisonModeValue;
  readonly createdAt: string;
  readonly documents: readonly DocumentReadResult[];
  readonly summary: ChangeSummaryResult;
  readonly pairs: readonly PairComparisonResult[];
  readonly inconsistencies: readonly AlertResult[];
  readonly decisions: DecisionsResult;
}

/** Avance: los mismos avisos de lectura de la revisión y uno por cada par comparado. */
export type ComparisonProgressEvent =
  | ReviewProgressEvent
  | { readonly kind: "pair_compared"; readonly position: number; readonly total: number };

export interface ComparisonRequest {
  readonly name: string;
  readonly mode: ComparisonModeValue;
  readonly files: readonly File[];
  readonly onProgress?: (event: ComparisonProgressEvent) => void;
}

/** Puerto de la interfaz para las comparaciones; el cliente HTTP lo implementa. */
export interface ComparisonGateway {
  startComparison(request: ComparisonRequest): Promise<ComparisonResult>;
  openComparison(comparisonId: string): Promise<ComparisonResult>;
  decide(comparisonId: string, decision: DecisionInput): Promise<DecisionsResult>;
  undoDecision(comparisonId: string): Promise<DecisionsResult>;
}
