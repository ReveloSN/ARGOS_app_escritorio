import { useRef, useState } from "react";

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

/** ¿Se puede aplicar esta respuesta? Si sí, queda como la más reciente aplicada. */
type ClaimNewest = () => boolean;

/**
 * Decidir y deshacer comparten un orden. Cada respuesta trae todas las decisiones: se aplica si
 * es más reciente que la última aplicada. Una vieja que llega tarde no hace volver la pantalla
 * atrás, pero si la última acción falla, la anterior que sí se guardó se muestra igual.
 */
function useLatestAction(): () => ClaimNewest {
  const requested = useRef(0);
  const applied = useRef(0);
  return () => {
    const action = ++requested.current;
    return () => {
      if (action <= applied.current) return false;
      applied.current = action;
      return true;
    };
  };
}

function confirmWith(target: DecisionTarget, notice: TimedNotice, claim: ClaimNewest) {
  return (message: string, isUndoable: boolean) => (result: DecisionsResult) => {
    if (!claim()) return;
    target.apply(result);
    notice.show(message, isUndoable);
  };
}

/**
 * El fallo se juzga por alerta: decidir la alerta 2 no oculta que la 1 no se guardó; solo una
 * decisión posterior sobre la misma alerta lo vuelve obsoleto.
 */
function useLatestPerAlert(): (alertNumber: number) => () => boolean {
  const latest = useRef(new Map<number, symbol>());
  return (alertNumber) => {
    const action = Symbol(String(alertNumber));
    latest.current.set(alertNumber, action);
    return () => latest.current.get(alertNumber) === action;
  };
}

function useDecide(target: DecisionTarget, notice: TimedNotice, begin: () => ClaimNewest) {
  const [failure, setFailure] = useState<DecisionInput | null>(null);
  const beginForAlert = useLatestPerAlert();
  const decide = (input: DecisionInput) => {
    setFailure(null);
    const isLatestForAlert = beginForAlert(input.alertNumber);
    const onSaved = confirmWith(target, notice, begin())(target.decidedMessage(input), true);
    target.send(input).then(onSaved, () => {
      if (isLatestForAlert()) setFailure(input);
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
  const begin = useLatestAction();
  const undo = () => {
    const onUndone = confirmWith(target, notice, begin())(t("decisionNotice.undone"), false);
    // Un fallo siempre se dice: no reemplaza nada en pantalla.
    target.sendUndo().then(onUndone, () => {
      notice.show(t("decisionNotice.undoFailed"));
    });
  };
  return { ...useDecide(target, notice, begin), undo };
}
