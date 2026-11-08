import type { DecisionState } from "../../components/atoms/DecisionTag";
import type { DecisionResult, ReviewResult } from "../../services/engine/reviewTypes";

/** La decisión vigente de una alerta, si ya la tiene. */
export function decisionOf(review: ReviewResult, number: number): DecisionResult | undefined {
  return review.decisions.decisions.find((decision) => decision.alertNumber === number);
}

export function decisionStateOf(review: ReviewResult, number: number): DecisionState {
  return decisionOf(review, number)?.kind ?? "pending";
}

/**
 * Alertas que tienen decisión, contadas por alerta (no por decisiones): una decisión de una
 * alerta que ya no existe no cuenta. Es la misma cuenta que usa el estado de la sesión (§16).
 */
export function isDecided(review: ReviewResult, number: number): boolean {
  return decisionOf(review, number) !== undefined;
}

export function decidedCount(review: ReviewResult): number {
  return review.alerts.filter((alert) => isDecided(review, alert.number)).length;
}

export function pendingCount(review: ReviewResult): number {
  return review.alerts.length - decidedCount(review);
}

/** Una revisión cerrada queda en el historial como solo lectura. */
export function isReadOnly(review: ReviewResult): boolean {
  return review.session.closedAt !== null;
}
