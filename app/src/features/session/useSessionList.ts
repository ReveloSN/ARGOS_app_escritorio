import { useEngineServices } from "../engine/EngineServicesContext";
import { useEngineQuery, type QueryState } from "../engine/useEngineQuery";
import { SESSION_LIST_DAYS, toSessionItems, type SessionListItem } from "./sessionList";
import type { ReviewDigest } from "./sessionSnapshot";

/**
 * Las sesiones del historial. La consulta se repite cuando cambia algo que el menú muestra de la
 * activa (nombre, pendientes, cierre), para que sus cifras nunca queden desactualizadas.
 */
export function useSessionList(active: ReviewDigest): QueryState<readonly SessionListItem[]> {
  const { history } = useEngineServices();
  const key = `sessions:${active.id}:${active.name}:${String(active.pendingCount)}:${String(active.isClosed)}`;
  const query = useEngineQuery(key, () => history.history(SESSION_LIST_DAYS));
  const state = query.state;
  if (state.status !== "ready") return state;
  return { status: "ready", data: toSessionItems(state.data.sessions, active) };
}
