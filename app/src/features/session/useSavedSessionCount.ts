import { useEngineServices } from "../engine/EngineServicesContext";
import { useEngineQuery } from "../engine/useEngineQuery";
import { SESSION_LIST_DAYS } from "./sessionList";

/**
 * Cuántas revisiones guardadas hay en el historial; undefined mientras carga (no se sabe aún) y
 * 0 si el motor no responde.
 * Se consulta de nuevo cuando cambia la sesión activa. Una sesión recién eliminada sigue en la
 * cuenta durante el plazo para deshacer.
 */
export function useSavedSessionCount(activeSessionId: string | undefined): number | undefined {
  const { history } = useEngineServices();
  const key = `saved-session-count:${activeSessionId ?? "none"}`;
  const { state } = useEngineQuery(key, () => history.history(SESSION_LIST_DAYS));
  if (state.status === "loading") return undefined;
  return state.status === "ready" ? state.data.sessions.length : 0;
}
