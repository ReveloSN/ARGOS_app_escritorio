import { useCallback, useEffect, useMemo, useState } from "react";

import { useEngineServices } from "../engine/EngineServicesContext";
import { useReview } from "../review/reviewContext";
import type { AssistantSignalsState } from "./assistantContext";

interface UnconfirmedCount {
  readonly sessionId: string;
  readonly count: number;
}

/** Al abrir un expediente se pregunta al motor cuántos datos quedan «Sin confirmar». */
function useUnconfirmedOnOpen(report: (sessionId: string, count: number) => void) {
  const { facts } = useEngineServices();
  const sessionId = useReview().review?.session.id;
  useEffect(() => {
    if (!sessionId) return;
    facts.listFacts(sessionId).then(
      (result) => {
        report(sessionId, result.pending.length);
      },
      // Sin respuesta no se sabe si hay dudas: el asistente no muestra una que no consta.
      () => undefined,
    );
  }, [facts, sessionId, report]);
}

export function useAssistantSignalsState(): AssistantSignalsState {
  const [isExplaining, setExplaining] = useState(false);
  const [unconfirmed, setUnconfirmed] = useState<UnconfirmedCount | null>(null);
  const reportUnconfirmed = useCallback((sessionId: string, count: number) => {
    setUnconfirmed({ sessionId, count });
  }, []);
  useUnconfirmedOnOpen(reportUnconfirmed);
  return useMemo(
    () => ({
      isExplaining,
      setExplaining,
      reportUnconfirmed,
      unconfirmedFor: (sessionId) =>
        unconfirmed?.sessionId === sessionId ? unconfirmed.count : null,
    }),
    [isExplaining, unconfirmed, reportUnconfirmed],
  );
}
