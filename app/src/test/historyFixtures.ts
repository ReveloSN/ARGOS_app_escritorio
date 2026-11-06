import type { HistoryRecordResult, HistoryResult } from "../services/engine/historyTypes";
import { CLOSED_REVIEW, REVIEW } from "./reviewFixtures";

export const HISTORY: HistoryResult = {
  metrics: {
    sessionCount: 2,
    resolvedAlerts: 3,
    realErrorCount: 1,
    realErrorRate: 1 / 3,
    meanReviewSeconds: 400,
  },
  comparisons: [],
  sessions: [
    {
      id: "s-1",
      name: "Revisión de prueba",
      createdAt: REVIEW.session.createdAt,
      closedAt: CLOSED_REVIEW.session.closedAt,
      status: "closed",
      documentCount: 3,
      alertCount: 2,
      decidedCount: 1,
    },
    {
      id: "s-2",
      name: "Contrato sin diferencias",
      createdAt: REVIEW.session.createdAt,
      closedAt: null,
      status: "in_progress",
      documentCount: 2,
      alertCount: 0,
      decidedCount: 0,
    },
  ],
};

export const RECORD: HistoryRecordResult = {
  sessionName: "Revisión de prueba",
  sessionCreatedAt: REVIEW.session.createdAt,
  alertNumber: 1,
  risk: "high",
  entityType: "contract_id",
  firstValue: "1234",
  secondValue: "1324",
  decision: "error",
  correctSide: "first",
  decidedAt: "2026-10-15T10:10:00+00:00",
};
