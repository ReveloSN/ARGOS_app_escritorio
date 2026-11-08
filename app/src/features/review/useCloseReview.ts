import { useLayoutEffect, useRef, useState } from "react";

import type { SessionResult } from "../../services/engine/reviewTypes";
import { useEngineServices } from "../engine/EngineServicesContext";
import { useReview } from "./reviewContext";

export interface ReviewCloser {
  readonly close: () => void;
  readonly hasFailed: boolean;
}

/** El valor de este render, legible cuando llegue una respuesta (no el de cuando se pidió). */
function useLatestValue<T>(value: T): { readonly current: T } {
  const latest = useRef(value);
  // Tras confirmar el render, no durante él: un render descartado no debe moverlo.
  useLayoutEffect(() => {
    latest.current = value;
  }, [value]);
  return latest;
}

/**
 * «Cerrar revisión»: la revisión queda en el historial y pasa a ser de solo lectura. El fallo es
 * de la sesión que se intentó cerrar: otra sesión abierta después no lo hereda.
 */
export function useCloseReview(onClosed: (sessionId: string) => void): ReviewCloser {
  const { reviews } = useEngineServices();
  const { review, updateSession } = useReview();
  const [failedId, setFailedId] = useState<string | null>(null);
  const activeId = useLatestValue(review?.session.id);
  const onDone = (session: SessionResult) => {
    updateSession(session);
    // Si entretanto abrió otra sesión, no lo saca de ella para llevarlo al historial.
    if (activeId.current === session.id) onClosed(session.id);
  };
  const close = () => {
    if (!review) return;
    const requestedId = review.session.id;
    setFailedId(null);
    reviews.closeReview(requestedId).then(onDone, () => {
      setFailedId(requestedId);
    });
  };
  return { close, hasFailed: failedId !== null && failedId === review?.session.id };
}
