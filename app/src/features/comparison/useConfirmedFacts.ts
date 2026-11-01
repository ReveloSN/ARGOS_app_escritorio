import type { FactResult, FactsResult } from "../../services/engine/factTypes";
import { useEngineServices } from "../engine/EngineServicesContext";
import { useEngineQuery } from "../engine/useEngineQuery";
import { useReview } from "../review/reviewContext";
import { activeFacts } from "./confirmedFacts";

const NO_FACTS: FactsResult = { facts: [], pending: [], canUndo: false };

/**
 * Los datos confirmados del expediente abierto: son la fuente de verdad contra la que se leen las
 * inconsistencias. Sin expediente abierto, o si el motor no responde, no hay referencia y se dice.
 */
export function useConfirmedFacts(): readonly FactResult[] {
  const { facts } = useEngineServices();
  const { review } = useReview();
  const sessionId = review?.session.id;
  const query = useEngineQuery(`comparison-facts:${sessionId ?? "none"}`, () =>
    sessionId ? facts.listFacts(sessionId) : Promise.resolve(NO_FACTS),
  );
  return query.state.status === "ready" ? activeFacts(query.state.data.facts) : [];
}
