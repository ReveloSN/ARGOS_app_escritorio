import { useState } from "react";

import { useI18n } from "../../i18n/i18nContext";
import type { AlertDecisions } from "../alerts/useAlertDecisions";
import { useDecisionCommands, type DecisionTarget } from "../alerts/useDecisionCommands";
import type { TimedNotice } from "../alerts/useTimedNotice";
import { useEngineServices } from "../engine/EngineServicesContext";
import { useSendReview } from "./sendContext";

function useSendDecisionTarget(): DecisionTarget {
  const { t } = useI18n();
  const { sending } = useEngineServices();
  const { review, updateDecisions } = useSendReview();
  const reviewId = review?.id ?? "";
  return {
    send: (input) => sending.decide(reviewId, input),
    sendUndo: () => sending.undoDecision(reviewId),
    apply: updateDecisions,
    decidedMessage: (input) => t(`sending.decided.${input.kind}`, { number: input.alertNumber }),
  };
}

/** Corregir, «Es correcto» o «Ignorar» cada problema, con confirmación y Ctrl Z. */
export function useSendDecisions(notice: TimedNotice): AlertDecisions {
  const { review } = useSendReview();
  const commands = useDecisionCommands(useSendDecisionTarget(), notice);
  return {
    isReadOnly: !review,
    canUndo: review?.decisions.canUndo ?? false,
    notice,
    ...commands,
  };
}

/** «Abrir en el correo»: arma la copia corregida y la abre; si falla, se puede reintentar. */
export function useOpenCorrected(notice: TimedNotice) {
  const { t } = useI18n();
  const { sending } = useEngineServices();
  const { review } = useSendReview();
  const [hasFailed, setHasFailed] = useState(false);
  const open = () => {
    if (!review) return;
    setHasFailed(false);
    sending.openCorrected(review.id).then(
      () => {
        notice.show(t("sending.opened"));
      },
      () => {
        setHasFailed(true);
      },
    );
  };
  return { open, hasFailed };
}
