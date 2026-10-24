import { vi } from "vitest";

import type { EngineServices } from "../features/engine/EngineServicesContext";
import type { HistoryResult } from "../services/engine/historyTypes";
import type { ReviewResult } from "../services/engine/reviewTypes";
import { fakeEngineServices } from "./engineFakes";
import { CONTRACT_ALERT, REVIEW } from "./reviewFixtures";

/** La segunda sesión de las pruebas del selector: un documento y una alerta. */
export const SECOND_REVIEW: ReviewResult = {
  session: {
    id: "s-2",
    name: "Anexo de seguros",
    createdAt: "2026-10-20T10:00:00+00:00",
    closedAt: null,
  },
  documents: REVIEW.documents.slice(0, 1),
  alerts: [CONTRACT_ALERT],
  decisions: { decisions: [], canUndo: false },
};

export const TWO_SESSIONS: HistoryResult = {
  metrics: {
    sessionCount: 2,
    resolvedAlerts: 0,
    realErrorCount: 0,
    realErrorRate: null,
    meanReviewSeconds: null,
  },
  sessions: [
    {
      id: "s-2",
      name: "Anexo de seguros",
      createdAt: "2026-10-20T10:00:00+00:00",
      closedAt: null,
      status: "in_progress",
      documentCount: 1,
      alertCount: 1,
      decidedCount: 0,
    },
    {
      id: "s-1",
      name: "Revisión de prueba",
      createdAt: "2026-10-15T10:00:00+00:00",
      closedAt: null,
      status: "in_progress",
      documentCount: 3,
      alertCount: 2,
      decidedCount: 0,
    },
  ],
};

export interface TwoSessionEngine {
  readonly services: EngineServices;
  readonly openReview: ReturnType<typeof vi.fn>;
  readonly renameReview: ReturnType<typeof vi.fn>;
  readonly deleteReview: ReturnType<typeof vi.fn>;
}

/** Un motor de prueba con dos sesiones guardadas; los espías se devuelven aparte. */
export function engineWithTwoSessions(): TwoSessionEngine {
  const openReview = vi.fn(() => Promise.resolve(SECOND_REVIEW));
  const renameReview = vi.fn((id: string, name: string) =>
    Promise.resolve({ ...REVIEW.session, id, name }),
  );
  const deleteReview = vi.fn(() => Promise.resolve());
  const services = fakeEngineServices({
    history: { history: vi.fn(() => Promise.resolve(TWO_SESSIONS)) },
    reviews: { openReview, renameReview, deleteReview },
  });
  return { services, openReview, renameReview, deleteReview };
}
