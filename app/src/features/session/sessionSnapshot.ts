import type { ComparisonResult } from "../../services/engine/comparisonTypes";
import type { ReviewResult, RiskLevelValue } from "../../services/engine/reviewTypes";
import { isDecided, isReadOnly } from "../alerts/alertDecisions";

export type PendingByRisk = Readonly<Record<RiskLevelValue, number>>;

export interface ReviewDigest {
  readonly id: string;
  readonly name: string;
  readonly isClosed: boolean;
  readonly documentCount: number;
  /** Los archivos que se leyeron: los únicos que se pueden comparar sin cargarlos otra vez. */
  readonly readableDocuments: readonly string[];
  readonly alertCount: number;
  readonly pendingCount: number;
  readonly pendingByRisk: PendingByRisk;
}

export interface ComparisonDigest {
  readonly id: string;
  readonly name: string;
  readonly documentCount: number;
  readonly changeCount: number;
}

/**
 * El estado de la sesión activa tal como lo entrega el motor: la única fuente de la que leen la
 * barra lateral, Inicio y la barra superior. Ninguna pantalla cuenta por su cuenta.
 */
export interface SessionSnapshot {
  readonly review: ReviewDigest | null;
  readonly comparisons: readonly ComparisonDigest[];
}

const NO_PENDING: PendingByRisk = { high: 0, medium: 0, low: 0 };

function pendingByRisk(review: ReviewResult): PendingByRisk {
  const counts = { ...NO_PENDING };
  for (const alert of review.alerts) {
    if (!isDecided(review, alert.number)) counts[alert.risk] += 1;
  }
  return counts;
}

function digestOfReview(review: ReviewResult): ReviewDigest {
  const byRisk = pendingByRisk(review);
  return {
    id: review.session.id,
    name: review.session.name,
    isClosed: isReadOnly(review),
    documentCount: review.documents.length,
    readableDocuments: review.documents
      .filter((document) => document.status === "read")
      .map((document) => document.name),
    alertCount: review.alerts.length,
    pendingCount: byRisk.high + byRisk.medium + byRisk.low,
    pendingByRisk: byRisk,
  };
}

function digestOfComparison(comparison: ComparisonResult): ComparisonDigest {
  const { removed, added, modified, moved } = comparison.summary.byKind;
  return {
    id: comparison.id,
    name: comparison.name,
    documentCount: comparison.documents.length,
    changeCount: removed + added + modified + moved,
  };
}

/** Las comparaciones de la sesión: la abierta primero y, después, las cerradas recientes. */
export function snapshotOf(
  review: ReviewResult | null,
  comparisons: readonly ComparisonResult[],
): SessionSnapshot {
  return {
    review: review && digestOfReview(review),
    comparisons: comparisons.map(digestOfComparison),
  };
}

/** El estado vacío solo existe si de verdad no hay documentos ni comparaciones. */
export function isEmptySnapshot(snapshot: SessionSnapshot): boolean {
  return snapshot.review === null && snapshot.comparisons.length === 0;
}
