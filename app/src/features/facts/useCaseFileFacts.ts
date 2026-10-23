import type { FactsResult } from "../../services/engine/factTypes";
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
  return { query, changes: useFactChanges(sessionId, query.replace) };
}
