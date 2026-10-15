/** Respuesta de POST /reviews del motor (engine/argus/api/schemas/review.py). */

export type RiskLevelValue = "high" | "medium" | "low";

export type EntityTypeValue =
  "contract_id" | "date" | "money" | "tax_id" | "person_name" | "organization_name" | "period";

export type UnreadableReasonValue =
  "no_text" | "encrypted" | "corrupted" | "too_large" | "not_found" | "unsupported_format";

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

export interface AlertResult {
  readonly number: number;
  readonly risk: RiskLevelValue;
  readonly entityType: EntityTypeValue;
  readonly differenceKind: string;
  readonly confidence: number;
  readonly highlightPositions: readonly number[];
  readonly first: AlertSideResult;
  readonly second: AlertSideResult;
}

export interface DocumentReadResult {
  readonly name: string;
  readonly status: "read" | "unreadable";
  readonly reason: UnreadableReasonValue | null;
  readonly fragmentCount: number;
}

export interface ReviewResult {
  readonly session: { readonly id: string; readonly name: string; readonly createdAt: string };
  readonly documents: readonly DocumentReadResult[];
  readonly alerts: readonly AlertResult[];
}

export interface ReviewRequest {
  readonly name: string;
  readonly files: readonly File[];
}

/** Puerto de la interfaz para iniciar revisiones; el cliente HTTP lo implementa. */
export interface ReviewStarter {
  startReview(request: ReviewRequest): Promise<ReviewResult>;
}
