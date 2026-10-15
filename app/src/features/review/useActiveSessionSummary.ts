import type { ActiveSessionSummary } from "../../components/organisms/Sidebar";
import { useI18n } from "../../i18n/i18nContext";
import type { ReviewResult } from "../../services/engine/reviewTypes";

export interface SessionIndicators {
  readonly card: ActiveSessionSummary;
  readonly badge: string | undefined;
}

/** Sesión activa y contador de la barra lateral, derivados de la revisión real (o nada). */
export function useActiveSessionSummary(
  review: ReviewResult | null,
): SessionIndicators | undefined {
  const { tPlural } = useI18n();
  if (!review) return undefined;
  // Sin decisiones todavía, toda alerta recibida está pendiente.
  const pending = review.alerts.length;
  const summary = tPlural({
    key: "review.pendingSummary",
    count: pending,
    params: { total: review.alerts.length },
  });
  return {
    card: { name: review.session.name, summary },
    badge: pending > 0 ? String(pending) : undefined,
  };
}
