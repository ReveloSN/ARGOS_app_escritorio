import { useI18n } from "../../i18n/i18nContext";
import type { TranslationKey } from "../../i18n/translate";
import type { DecisionKindValue } from "../../services/engine/reviewTypes";
import { useEngineServices } from "../engine/EngineServicesContext";
import { useReview } from "../review/reviewContext";
import { isReadOnly } from "./alertDecisions";
import {
  useDecisionCommands,
  type DecisionCommands,
  type DecisionTarget,
} from "./useDecisionCommands";
import { useTimedNotice, type TimedNotice } from "./useTimedNotice";

export const DECISION_LABELS: Readonly<Record<DecisionKindValue, TranslationKey>> = {
  correct: "decision.correct",
  error: "decision.error",
  ignored: "decision.ignored",
};

export interface AlertDecisions extends DecisionCommands {
  readonly isReadOnly: boolean;
  readonly canUndo: boolean;
  readonly notice: TimedNotice;
}

function useReviewDecisionTarget(): DecisionTarget {
  const { t } = useI18n();
  const { reviews } = useEngineServices();
  const { review, updateDecisions } = useReview();
  const sessionId = review?.session.id ?? "";
  return {
    send: (input) => reviews.decide(sessionId, input),
    sendUndo: () => reviews.undoDecision(sessionId),
    apply: updateDecisions,
    decidedMessage: (input) =>
      t("decisionNotice.decided", {
        number: input.alertNumber,
        decision: t(DECISION_LABELS[input.kind]),
      }),
  };
}

/** «Es correcto», «Es un error» e «Ignorar» con confirmación y deshacer (Ctrl Z). */
export function useAlertDecisions(): AlertDecisions {
  const { review } = useReview();
  const notice = useTimedNotice();
  const commands = useDecisionCommands(useReviewDecisionTarget(), notice);
  return {
    isReadOnly: !review || isReadOnly(review),
    canUndo: review?.decisions.canUndo ?? false,
    notice,
    ...commands,
  };
}
