/** Historial del motor (engine/argus/api/schemas/history.py). */

import type {
  CorrectSideValue,
  DecisionKindValue,
  EntityTypeValue,
  RiskLevelValue,
} from "./reviewTypes";

export type SessionStatusValue = "in_progress" | "closed" | "no_inconsistencies";

export interface UsageMetricsResult {
  readonly sessionCount: number;
  readonly resolvedAlerts: number;
  readonly realErrorCount: number;
  /** null cuando aún no hay datos: no se muestra «0 %» por un resultado que no existe. */
  readonly realErrorRate: number | null;
  readonly meanReviewSeconds: number | null;
}

export interface HistorySessionResult {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  readonly closedAt: string | null;
  readonly status: SessionStatusValue;
  readonly documentCount: number;
  readonly alertCount: number;
  readonly decidedCount: number;
}

export interface HistoryResult {
  readonly metrics: UsageMetricsResult;
  readonly sessions: readonly HistorySessionResult[];
}

export interface HistoryRecordResult {
  readonly sessionName: string;
  readonly sessionCreatedAt: string;
  readonly alertNumber: number;
  readonly risk: RiskLevelValue;
  readonly entityType: EntityTypeValue;
  readonly firstValue: string;
  readonly secondValue: string;
  readonly decision: DecisionKindValue | null;
  readonly correctSide: CorrectSideValue | null;
  readonly decidedAt: string | null;
}

export interface HistorySource {
  history(days: number): Promise<HistoryResult>;
  records(days: number): Promise<readonly HistoryRecordResult[]>;
}
