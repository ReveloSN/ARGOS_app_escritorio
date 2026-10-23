import { useState } from "react";

import { useI18n } from "../../i18n/i18nContext";
import type { DecisionInput, DecisionsResult } from "../../services/engine/reviewTypes";
import type { TimedNotice } from "./useTimedNotice";

/** A quién se le guardan las decisiones: una revisión o una comparación. */
export interface DecisionTarget {
  readonly send: (input: DecisionInput) => Promise<DecisionsResult>;
  readonly sendUndo: () => Promise<DecisionsResult>;
  /** Guarda en la vista las decisiones que devuelve el motor. */
  readonly apply: (result: DecisionsResult) => void;
  /** Confirmación tras decidir («Alerta 3 marcada como…», «Cambio 3 marcado como…»). */
  readonly decidedMessage: (input: DecisionInput) => string;
}

export interface DecisionCommands {
  readonly decide: (input: DecisionInput) => void;
  readonly undo: () => void;
  /** La decisión que no se pudo guardar, para ofrecer «Reintentar». */
  readonly failure: DecisionInput | null;
  readonly retry: () => void;
}

function confirmWith(target: DecisionTarget, notice: TimedNotice) {
  return (message: string, isUndoable: boolean) => (result: DecisionsResult) => {
    target.apply(result);
    notice.show(message, isUndoable);
  };
}

function useDecide(target: DecisionTarget, notice: TimedNotice) {
  const [failure, setFailure] = useState<DecisionInput | null>(null);
  const decide = (input: DecisionInput) => {
    setFailure(null);
    const onSaved = confirmWith(target, notice)(target.decidedMessage(input), true);
    target.send(input).then(onSaved, () => {
      setFailure(input);
    });
  };
  const retry = () => {
    if (failure) decide(failure);
  };
  return { decide, failure, retry };
}

/** Decidir y deshacer con confirmación breve; una decisión que falla queda para reintentar. */
export function useDecisionCommands(target: DecisionTarget, notice: TimedNotice): DecisionCommands {
  const { t } = useI18n();
  const undo = () => {
    const onUndone = confirmWith(target, notice)(t("decisionNotice.undone"), false);
    target.sendUndo().then(onUndone, () => {
      notice.show(t("decisionNotice.undoFailed"));
    });
  };
  return { ...useDecide(target, notice), undo };
}
