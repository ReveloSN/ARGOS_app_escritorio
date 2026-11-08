import { useEffect, useRef } from "react";

/** Qué respuestas siguen valiendo: las de esta sesión y, para la tabla, la más reciente. */
export interface FactTurn {
  /** Si es más reciente que la última aplicada (y de esta sesión); si sí, queda como aplicada. */
  readonly claim: () => boolean;
  readonly isSameSession: () => boolean;
}

/**
 * Cada respuesta trae todos los datos: se aplica si es más reciente que la última aplicada. Una
 * vieja que llega tarde no hace volver la tabla atrás, pero si la última acción falla, la anterior
 * que sí se guardó se muestra. Lo que llegue de otra sesión no toca la que está abierta.
 */
export function useFactTurns(sessionId: string): () => FactTurn {
  const latestAction = useRef(0);
  const appliedAction = useRef(0);
  const sessionTurn = useRef(0);
  useEffect(
    () => () => {
      sessionTurn.current += 1;
    },
    [sessionId],
  );
  return () => {
    const action = ++latestAction.current;
    const session = sessionTurn.current;
    const isSameSession = () => session === sessionTurn.current;
    return { claim: claimFor(action, appliedAction, isSameSession), isSameSession };
  };
}

/** Reclama la tabla si la acción es más reciente que la última aplicada, en la misma sesión. */
function claimFor(
  action: number,
  applied: { current: number },
  isSameSession: () => boolean,
): () => boolean {
  return () => {
    if (!isSameSession() || action <= applied.current) return false;
    applied.current = action;
    return true;
  };
}

export interface Settlement<Result> {
  /** Reemplaza la tabla: solo si la respuesta es la más reciente. */
  readonly onResult: (result: Result) => void;
  readonly onError: (error: unknown) => void;
  /** Lo propio de esta operación (cerrar su formulario): si se guardó, en la misma sesión. */
  readonly onSucceeded?: (() => void) | undefined;
}

/** Aplica la respuesta si es la más reciente; un fallo o un éxito propio, si es la misma sesión. */
export function settleIn<Result>(
  answer: Promise<Result>,
  turn: FactTurn,
  { onResult, onError, onSucceeded }: Settlement<Result>,
): void {
  answer.then(
    (result) => {
      if (!turn.isSameSession()) return;
      onSucceeded?.();
      if (turn.claim()) onResult(result);
    },
    (error: unknown) => {
      if (turn.isSameSession()) onError(error);
    },
  );
}
