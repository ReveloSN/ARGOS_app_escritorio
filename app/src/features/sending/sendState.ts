import type { DecisionKindValue } from "../../services/engine/reviewTypes";
import type {
  DraftAttachmentResult,
  SendFixResult,
  SendIssueResult,
  SendReviewResult,
} from "../../services/engine/sendTypes";

/** La decisión vigente sobre un problema, o undefined si sigue pendiente. */
export function decisionOf(
  review: SendReviewResult,
  issue: SendIssueResult,
): DecisionKindValue | undefined {
  return review.decisions.decisions.find((item) => item.alertNumber === issue.number)?.kind;
}

export function pendingIssues(review: SendReviewResult): SendIssueResult[] {
  return review.issues.filter((issue) => decisionOf(review, issue) === undefined);
}

export function pendingHighCount(review: SendReviewResult): number {
  return pendingIssues(review).filter((issue) => issue.risk === "high").length;
}

/** Las correcciones que el usuario aceptó al marcar el problema como error. */
export function appliedFixes(review: SendReviewResult): SendFixResult[] {
  return review.issues.flatMap((issue) =>
    issue.fix && decisionOf(review, issue) === "error" ? [issue.fix] : [],
  );
}

/** Un adjunto como queda en la copia corregida: los que entran se marcan como nuevos. */
export interface ShownAttachment {
  readonly name: string;
  readonly size: number | null;
  readonly isAdded: boolean;
}

export function correctedAttachments(review: SendReviewResult): ShownAttachment[] {
  const fixes = appliedFixes(review);
  const removed = new Set(
    fixes.filter((fix) => fix.kind === "replace_attachment").map((fix) => fix.target),
  );
  const kept = review.draft.attachments
    .filter((item) => !removed.has(item.name))
    .map((item: DraftAttachmentResult) => ({ name: item.name, size: item.size, isAdded: false }));
  const added = fixes
    .filter((fix) => fix.replacement !== "")
    .map((fix) => ({ name: fix.replacement, size: null, isAdded: true }));
  return [...kept, ...added];
}

/** Los destinatarios que siguen en la copia corregida. */
export function correctedRecipients(
  review: SendReviewResult,
  recipients: readonly string[],
): string[] {
  const removed = new Set(
    appliedFixes(review)
      .filter((fix) => fix.kind === "remove_recipient")
      .map((fix) => fix.target),
  );
  return recipients.filter((address) => !removed.has(address));
}
