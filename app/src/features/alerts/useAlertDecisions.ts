import { useState } from "react";

import { useI18n } from "../../i18n/i18nContext";
import type { TranslationKey } from "../../i18n/translate";
import type {
  DecisionInput,
  DecisionKindValue,
  DecisionsResult,
} from "../../services/engine/reviewTypes";
import { useEngineServices } from "../engine/EngineServicesContext";
import { useReview } from "../review/reviewContext";
import { isReadOnly } from "./alertDecisions";
import { useTimedNotice, type TimedNotice } from "./useTimedNotice";

export const DECISION_LABELS: Readonly<Record<DecisionKindValue, TranslationKey>> = {
  correct: "decision.correct",
  error: "decision.error",
  ignored: "decision.ignored",
};

interface DecisionCommands {
  readonly decide: (input: DecisionInput) => void;
  readonly undo: () => void;
  /** La decisión que no se pudo guardar, para ofrecer «Reintentar». */
  readonly failure: DecisionInput | null;
  readonly retry: () => void;
}

export interface AlertDecisions extends DecisionCommands {
  readonly isReadOnly: boolean;
  readonly canUndo: boolean;
  readonly notice: TimedNotice;
}

/** «Es correcto», «Es un error» e «Ignorar» con confirmación y deshacer (Ctrl Z). */
export function useAlertDecisions(): AlertDecisions {
  const { review } = useReview();
  const notice = useTimedNotice();
  const decide = useDecide(notice);
  const undo = useUndo(notice);
  return {
    isReadOnly: !review || isReadOnly(review),
    canUndo: review?.decisions.canUndo ?? false,
    notice,
    ...decide,
    undo,
  };
}

/** Guarda en la revisión las decisiones que devuelve el motor y confirma con un aviso. */
function useDecisionSaver(notice: TimedNotice) {
  const { reviews } = useEngineServices();
  const { review, updateDecisions } = useReview();
  const apply = (message: string, isUndoable: boolean) => (result: DecisionsResult) => {
    updateDecisions(result);
    notice.show(message, isUndoable);
  };
  return { reviews, sessionId: review?.session.id ?? "", apply };
}

function useDecide(notice: TimedNotice): Omit<DecisionCommands, "undo"> {
  const { t } = useI18n();
  const { reviews, sessionId, apply } = useDecisionSaver(notice);
  const [failure, setFailure] = useState<DecisionInput | null>(null);
  const decide = (input: DecisionInput) => {
    setFailure(null);
    const decision = t(DECISION_LABELS[input.kind]);
    const message = t("decisionNotice.decided", { number: input.alertNumber, decision });
    reviews.decide(sessionId, input).then(apply(message, true), () => {
      setFailure(input);
    });
  };
  const retry = () => {
    if (failure) decide(failure);
  };
  return { decide, failure, retry };
}

function useUndo(notice: TimedNotice): () => void {
  const { t } = useI18n();
  const { reviews, sessionId, apply } = useDecisionSaver(notice);
  return () => {
    reviews.undoDecision(sessionId).then(apply(t("decisionNotice.undone"), false), () => {
      notice.show(t("decisionNotice.undoFailed"));
    });
  };
}
