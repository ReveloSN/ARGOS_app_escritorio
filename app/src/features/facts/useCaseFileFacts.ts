import { useEffect } from "react";

import type { FactsResult } from "../../services/engine/factTypes";
import { useAssistantSignals } from "../assistant/assistantContext";
import { useEngineServices } from "../engine/EngineServicesContext";
import { useEngineQuery, type EngineQuery } from "../engine/useEngineQuery";
import { useFactChanges, type FactChanges } from "./useFactChanges";

export interface CaseFileFacts {
  readonly query: EngineQuery<FactsResult>;
  readonly changes: FactChanges;
}

/** Los datos confirmados del expediente: se cargan al abrir la pestaña y cada cambio los renueva. */
export function useCaseFileFacts(sessionId: string): CaseFileFacts {
  const { facts } = useEngineServices();
  const query = useEngineQuery(`facts:${sessionId}`, () => facts.listFacts(sessionId));
  useUnconfirmedReport(sessionId, query.state.status === "ready" ? query.state.data : null);
  return { query, changes: useFactChanges(sessionId, query.replace) };
}

/** Cada respuesta del motor le dice al asistente cuántos datos siguen «Sin confirmar». */
function useUnconfirmedReport(sessionId: string, result: FactsResult | null) {
  const { reportUnconfirmed } = useAssistantSignals();
  const count = result?.pending.length;
  useEffect(() => {
    if (count !== undefined) reportUnconfirmed(sessionId, count);
  }, [sessionId, count, reportUnconfirmed]);
}
