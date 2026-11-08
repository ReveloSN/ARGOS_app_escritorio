import { useRef, useState } from "react";

import { useEngineServices } from "../engine/EngineServicesContext";
import { useReview } from "../review/reviewContext";

export interface SessionSwitch {
  readonly switchTo: (sessionId: string) => void;
  readonly hasFailed: boolean;
  readonly dismissFailure: () => void;
}

/**
 * Abre una sesión guardada; Comparar se reinicia solo al cambiar la sesión activa. Si se piden
 * varias seguidas, gana la última pedida aunque el motor responda en otro orden.
 */
function useShowSession(): (sessionId: string) => Promise<void> {
  const { reviews } = useEngineServices();
  const { showReview } = useReview();
  const latest = useRef(0);
  return async (sessionId) => {
    const request = ++latest.current;
    const opened = await reviews.openReview(sessionId).catch((error: unknown) => {
      if (request === latest.current) throw error;
      return null;
    });
    if (opened && request === latest.current) showReview(opened);
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
