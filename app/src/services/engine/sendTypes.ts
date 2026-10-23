/** Borrador revisado antes de enviar, tal como lo entrega el motor (engine/argus/api/schemas/send_review.py). */

import type { DecisionInput, DecisionsResult, RiskLevelValue } from "./reviewTypes";

export type SendIssueKindValue = "period_mismatch" | "missing_attachment" | "foreign_recipient";
export type SendFixKindValue = "replace_attachment" | "add_attachment" | "remove_recipient";
export type DraftPartValue = "body" | "to" | "cc";

export interface DraftAttachmentResult {
  readonly name: string;
  readonly size: number;
}

export interface DraftResult {
  readonly fileName: string;
  readonly subject: string;
  readonly to: readonly string[];
  readonly cc: readonly string[];
  readonly body: string;
  readonly attachments: readonly DraftAttachmentResult[];
}

/** Lo que ARGUS cambia en la copia: el adjunto o destinatario que sale y el que entra. */
export interface SendFixResult {
  readonly kind: SendFixKindValue;
  readonly target: string;
  readonly replacement: string;
}

export interface SendIssueResult {
  readonly number: number;
  readonly kind: SendIssueKindValue;
  readonly risk: RiskLevelValue;
  readonly part: DraftPartValue;
  /** El texto exacto que se marca en el cuerpo, en «Para» o en «CC». */
  readonly markedText: string;
  readonly params: Readonly<Record<string, string>>;
  readonly fix: SendFixResult | null;
}

export interface SendReviewResult {
  readonly id: string;
  readonly sessionId: string | null;
  readonly createdAt: string;
  readonly draft: DraftResult;
  readonly issues: readonly SendIssueResult[];
  readonly decisions: DecisionsResult;
}

export interface SendReviewRequest {
  readonly file: File;
  /** El expediente abierto contra el que se compara; null si no hay uno. */
  readonly sessionId: string | null;
}

/** Puerto de la interfaz para «Revisar antes de enviar»; el cliente HTTP lo implementa. */
export interface SendGateway {
  reviewDraft(request: SendReviewRequest): Promise<SendReviewResult>;
  decide(reviewId: string, decision: DecisionInput): Promise<DecisionsResult>;
  undoDecision(reviewId: string): Promise<DecisionsResult>;
  openCorrected(reviewId: string): Promise<void>;
}
