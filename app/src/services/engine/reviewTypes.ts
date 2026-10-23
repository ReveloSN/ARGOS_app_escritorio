/** Revisión tal como la entrega el motor (engine/argus/api/schemas/review.py). */

import type { OcrProviderValue } from "./ocrTypes";

export type RiskLevelValue = "high" | "medium" | "low";

export type EntityTypeValue =
  "contract_id" | "date" | "money" | "tax_id" | "person_name" | "organization_name" | "period";

export type UnreadableReasonValue =
  | "no_text"
  | "encrypted"
  | "corrupted"
  | "too_large"
  | "not_found"
  | "unsupported_format"
  | "ocr_unavailable";

/** Cómo se obtuvo el texto: directo del archivo, con OCR local o con Document AI. */
export type ReadMethodValue = "text" | "local_ocr" | "cloud_ocr";

export type DifferenceKindValue =
  | "transposition"
  | "character_change"
  | "date_component"
  | "day_month_swap"
  | "similar_name"
  | "format_only"
  | "referenced_period"
  | "out_of_pattern"
  | "magnitude"
  | "amount_in_words"
  | "total_mismatch"
  | "date_order"
  | "impossible_date"
  | "blank_field";

export type DecisionKindValue = "correct" | "error" | "ignored";
export type CorrectSideValue = "first" | "second";

export type SourceLocationResult =
  | { readonly kind: "page"; readonly page: number }
  | { readonly kind: "paragraph"; readonly paragraph: number }
  | {
      readonly kind: "table_cell";
      readonly table: number;
      readonly row: number;
      readonly column: number;
    }
  | { readonly kind: "sheet_cell"; readonly sheet: string; readonly cell: string }
  | { readonly kind: "email_part"; readonly part: "subject" | "body" }
  | { readonly kind: "line"; readonly line: number };

export interface OccurrenceResult {
  readonly document: string;
  readonly location: SourceLocationResult;
  readonly excerpt: string;
}

export interface AlertSideResult {
  readonly value: string;
  readonly normalizedValue: string;
  readonly occurrences: readonly OccurrenceResult[];
}

/** Una frase de la explicación: clave de texto de `explanation.*`, sus datos y, si es plural, la cantidad. */
export interface ExplanationPartResult {
  readonly key: string;
  readonly params: Readonly<Record<string, string | number>>;
  readonly count: number | null;
}

export interface AlertResult {
  readonly number: number;
  readonly risk: RiskLevelValue;
  readonly entityType: EntityTypeValue;
  readonly differenceKind: DifferenceKindValue;
  readonly confidence: number;
  readonly highlightPositions: readonly number[];
  readonly first: AlertSideResult;
  /** Sin segundo valor en las verificaciones de un solo dato (fecha imposible, campo vacío). */
  readonly second: AlertSideResult | null;
  readonly explanation: readonly ExplanationPartResult[];
}

export interface DocumentReadResult {
  readonly name: string;
  readonly status: "read" | "unreadable";
  readonly reason: UnreadableReasonValue | null;
  readonly fragmentCount: number;
  readonly method: ReadMethodValue;
  /** Páginas de un PDF escaneado: lo que leería el OCR (y saldría del equipo con Document AI). */
  readonly pageCount: number | null;
}

export interface SessionResult {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  readonly closedAt: string | null;
}

export interface DecisionResult {
  readonly alertNumber: number;
  readonly kind: DecisionKindValue;
  readonly correctSide: CorrectSideValue | null;
  readonly decidedAt: string;
}

export interface DecisionsResult {
  readonly decisions: readonly DecisionResult[];
  readonly canUndo: boolean;
}

export interface ReviewResult {
  readonly session: SessionResult;
  readonly documents: readonly DocumentReadResult[];
  readonly alerts: readonly AlertResult[];
  readonly decisions: DecisionsResult;
}

/** Avance de la lectura, archivo por archivo, mientras el motor revisa (SSE). */
export type ReviewProgressEvent =
  | { readonly kind: "document_started"; readonly position: number; readonly name: string }
  | {
      readonly kind: "document_finished";
      readonly position: number;
      readonly document: DocumentReadResult;
    }
  | {
      readonly kind: "page_recognized";
      readonly position: number;
      readonly done: number;
      readonly total: number;
    }
  | { readonly kind: "analysis_started" };

/** «Activar OCR»: qué archivos se leen con OCR y quién lo hace. */
export interface OcrRequest {
  readonly fileNames: readonly string[];
  readonly provider: OcrProviderValue;
}

export interface ReviewRequest {
  readonly name: string;
  readonly files: readonly File[];
  readonly onProgress?: (event: ReviewProgressEvent) => void;
  readonly ocr?: OcrRequest;
  /** La lectura anterior, aún sin revisar, que esta reemplaza (se descarta en el motor). */
  readonly replaces?: string;
}

export interface DecisionInput {
  readonly alertNumber: number;
  readonly kind: DecisionKindValue;
  readonly correctSide?: CorrectSideValue;
}

/** Puerto de la interfaz para las revisiones; el cliente HTTP lo implementa. */
export interface ReviewGateway {
  startReview(request: ReviewRequest): Promise<ReviewResult>;
  openReview(sessionId: string): Promise<ReviewResult>;
  closeReview(sessionId: string): Promise<SessionResult>;
  decide(sessionId: string, decision: DecisionInput): Promise<DecisionsResult>;
  undoDecision(sessionId: string): Promise<DecisionsResult>;
}
