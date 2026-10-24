import type { ActiveSessionSummary } from "../../components/organisms/Sidebar";
import { useI18n } from "../../i18n/i18nContext";
import type { ReviewDigest } from "../session/sessionSnapshot";

export interface SessionIndicators {
  readonly card: ActiveSessionSummary;
  readonly badge: string | undefined;
}

/** Sesión activa y contador de la barra lateral, derivados del estado de la sesión (o nada). */
export function useActiveSessionSummary(
  review: ReviewDigest | null,
): SessionIndicators | undefined {
  const { t, tPlural } = useI18n();
  if (!review) return undefined;
  const summary = review.isClosed
    ? t("review.closedSummary")
    : tPlural({
        key: "review.pendingSummary",
        count: review.pendingCount,
        params: { total: review.alertCount },
      });
  return {
    card: { name: review.name, summary },
    badge: review.pendingCount > 0 && !review.isClosed ? String(review.pendingCount) : undefined,
  };
}
