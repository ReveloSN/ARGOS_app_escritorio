import type { EyeState } from "../../components/atoms/eyeShapes";
import type { EngineStatus } from "../../services/engine/engineStatusMonitor";
import type { ReviewResult } from "../../services/engine/reviewTypes";
import { decisionOf } from "../alerts/alertDecisions";
import type { ReadingProgress } from "../review/reviewContext";

/** En qué situación real está ARGUS; cada una tiene su forma del ojo y su texto. */
export type AssistantCondition =
  | "starting"
  | "paused"
  | "reading"
  | "explaining"
  | "ready"
  | "unreadable"
  | "highRisk"
  | "needsConfirmation"
  | "clear";

/** Los datos del motor y de la revisión de los que sale el estado; nunca se simulan. */
export interface AssistantSignals {
  readonly engine: EngineStatus;
  readonly reading: ReadingProgress | null;
  readonly isExplaining: boolean;
  readonly review: ReviewResult | null;
  /** Pares de valores «Sin confirmar» del expediente abierto. */
  readonly unconfirmed: number;
}

export interface AssistantStatus {
  readonly condition: AssistantCondition;
  readonly eye: EyeState;
  /** Archivos leídos, ilegibles, alertas altas pendientes o datos sin confirmar, según el caso. */
  readonly count: number;
  readonly total: number;
}

const EYES: Readonly<Record<AssistantCondition, EyeState>> = {
  starting: "idle",
  paused: "idle",
  reading: "reading",
  explaining: "explaining",
  ready: "reading",
  unreadable: "error",
  highRisk: "alert",
  needsConfirmation: "doubt",
  clear: "success",
};

function statusOf(condition: AssistantCondition, count = 0, total = 0): AssistantStatus {
  return { condition, eye: EYES[condition], count, total };
}

/** Lo que pasa ahora mismo (motor, lectura, explicación) pesa más que el estado del expediente. */
function activityStatus(signals: AssistantSignals): AssistantStatus | undefined {
  if (signals.engine === "stopped") return statusOf("paused");
  if (signals.engine === "starting") return statusOf("starting");
  if (signals.reading) return statusOf("reading", signals.reading.done, signals.reading.total);
  return signals.isExplaining ? statusOf("explaining") : undefined;
}

function pendingHighRisk(review: ReviewResult): number {
  return review.alerts.filter((alert) => alert.risk === "high" && !decisionOf(review, alert.number))
    .length;
}

function reviewStatus(review: ReviewResult, unconfirmed: number): AssistantStatus {
  const unreadable = review.documents.filter((document) => document.status === "unreadable");
  if (unreadable.length > 0) return statusOf("unreadable", unreadable.length);
  const highRisk = pendingHighRisk(review);
  if (highRisk > 0) return statusOf("highRisk", highRisk);
  if (unconfirmed > 0) return statusOf("needsConfirmation", unconfirmed);
  return statusOf(review.alerts.length === 0 ? "clear" : "ready");
}

/** El estado del asistente: ojo de la barra lateral, de la barra superior y su etiqueta. */
export function assistantStatus(signals: AssistantSignals): AssistantStatus {
  const activity = activityStatus(signals);
  if (activity) return activity;
  return signals.review ? reviewStatus(signals.review, signals.unconfirmed) : statusOf("ready");
}
