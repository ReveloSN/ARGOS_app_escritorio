import type { DecisionCardData } from "../../components/organisms/DecisionCard";
import type { I18n } from "../../i18n/i18nContext";
import type { AlertResult, DecisionResult, ReviewResult } from "../../services/engine/reviewTypes";
import { alertTitle, entityTypeLabel } from "./alertPresentation";
import { secondValue } from "./alertSides";

type CardContext = Pick<I18n, "t" | "format">;

/** «Valor correcto: 4857» cuando, al marcar un error, se indicó cuál valor es el correcto. */
function correctValueNote(alert: AlertResult, decision: DecisionResult, i18n: CardContext) {
  const side = decision.correctSide === "first" ? alert.first : alert.second;
  if (!decision.correctSide || !side) return undefined;
  return i18n.t("decisionCard.correctValue", { value: side.value });
}

export function toDecisionCard(
  alert: AlertResult,
  decision: DecisionResult,
  i18n: CardContext,
): DecisionCardData {
  return {
    number: alert.number,
    risk: alert.risk,
    typeLabel: entityTypeLabel(alert.entityType, i18n.t),
    title: alertTitle(alert, i18n.t),
    valueA: alert.first.value,
    valueB: secondValue(alert),
    decision: decision.kind,
    decidedAt: i18n.format.dateTime(new Date(decision.decidedAt)),
    note: correctValueNote(alert, decision, i18n),
  };
}

/** Las alertas ya decididas de una revisión, en el orden de la lista. */
export function decisionCardsOf(review: ReviewResult, i18n: CardContext): DecisionCardData[] {
  return review.alerts.flatMap((alert) => {
    const decision = review.decisions.decisions.find((item) => item.alertNumber === alert.number);
    return decision ? [toDecisionCard(alert, decision, i18n)] : [];
  });
}
