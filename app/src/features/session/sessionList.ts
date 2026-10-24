import type { HistorySessionResult } from "../../services/engine/historyTypes";
import type { ReviewDigest } from "./sessionSnapshot";

// El menú de sesiones muestra todo el historial que el motor conserva (retención de 90 días).
export const SESSION_LIST_DAYS = 365;

export interface SessionListItem {
  readonly id: string;
  readonly name: string;
  readonly documentCount: number;
  readonly pendingCount: number;
  readonly isClosed: boolean;
  /** Null mientras la lista no cargó: la activa se muestra solo con lo que ya se sabe. */
  readonly createdAt: string | null;
  readonly isActive: boolean;
}

/** Una sesión cerrada ya no tiene alertas pendientes: queda en solo lectura. */
function pendingOf(session: HistorySessionResult): number {
  return session.status === "in_progress" ? session.alertCount - session.decidedCount : 0;
}

function itemOf(session: HistorySessionResult): SessionListItem {
  return {
    id: session.id,
    name: session.name,
    documentCount: session.documentCount,
    pendingCount: pendingOf(session),
    isClosed: session.status !== "in_progress",
    createdAt: session.createdAt,
    isActive: false,
  };
}

/**
 * Las sesiones del historial. Las cifras de la activa salen del estado de la sesión (la fuente
 * única), no de la consulta, que puede ir un instante detrás de lo que se acaba de decidir.
 */
export function toSessionItems(
  sessions: readonly HistorySessionResult[],
  active: ReviewDigest,
): readonly SessionListItem[] {
  return sessions.map((session) =>
    session.id === active.id
      ? { ...activeSessionItem(active), createdAt: session.createdAt }
      : itemOf(session),
  );
}

/** La sesión activa tal como la conoce la interfaz, para el menú antes de que cargue la lista. */
export function activeSessionItem(active: ReviewDigest): SessionListItem {
  return {
    id: active.id,
    name: active.name,
    documentCount: active.documentCount,
    pendingCount: active.pendingCount,
    isClosed: active.isClosed,
    createdAt: null,
    isActive: true,
  };
}
