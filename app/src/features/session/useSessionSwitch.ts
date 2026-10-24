import { useState } from "react";

import { useComparison } from "../comparison/comparisonContext";
import { useEngineServices } from "../engine/EngineServicesContext";
import { useReview } from "../review/reviewContext";

export interface SessionSwitch {
  readonly switchTo: (sessionId: string) => void;
  readonly hasFailed: boolean;
  readonly dismissFailure: () => void;
}

/** Abre una sesión guardada y descarta la comparación de la anterior. */
function useShowSession(): (sessionId: string) => Promise<void> {
  const { reviews } = useEngineServices();
  const { showReview } = useReview();
  const { discardComparison } = useComparison();
  return async (sessionId) => {
    const opened = await reviews.openReview(sessionId);
    discardComparison();
    showReview(opened);
  };
}

/**
 * Cambia la sesión activa. Todo lo que muestra la app sale de ese estado, así que la barra
 * lateral, Inicio, el Expediente y Comparar se recargan juntos.
 */
export function useSessionSwitch(): SessionSwitch {
  const showSession = useShowSession();
  const { review } = useReview();
  const [hasFailed, setHasFailed] = useState(false);
  const switchTo = (sessionId: string) => {
    if (sessionId === review?.session.id) return;
    setHasFailed(false);
    showSession(sessionId).catch(() => {
      setHasFailed(true);
    });
  };
  const dismissFailure = () => {
    setHasFailed(false);
  };
  return { switchTo, hasFailed, dismissFailure };
}
