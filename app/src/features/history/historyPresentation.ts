import type { MetricView } from "../../components/organisms/MetricsStrip";
import type { SessionRowView } from "../../components/organisms/SessionHistoryTable";
import type { I18n } from "../../i18n/i18nContext";
import type {
  HistorySessionResult,
  SessionStatusValue,
  UsageMetricsResult,
} from "../../services/engine/historyTypes";
import { formatDuration } from "./formatDuration";

type HistoryContext = Pick<I18n, "t" | "tPlural" | "format">;

// Estados del historial de los mockups, con icono además del texto.
const STATUS_ICONS: Readonly<Record<SessionStatusValue, string>> = {
  in_progress: "pending",
  closed: "task_alt",
  no_inconsistencies: "check",
};

export function toSessionRow(session: HistorySessionResult, i18n: HistoryContext): SessionRowView {
  const { t, format } = i18n;
  return {
    id: session.id,
    name: session.name,
    date: format.dateTime(new Date(session.createdAt)),
    files: session.documentCount,
    alerts: session.alertCount,
    decided: session.alertCount
      ? t("history.decidedOf", { decided: session.decidedCount, total: session.alertCount })
      : t("history.noValue"),
    statusIcon: STATUS_ICONS[session.status],
    statusLabel: t(`history.status.${session.status}`),
  };
}

function resolvedMetric(metrics: UsageMetricsResult, i18n: HistoryContext): MetricView {
  return {
    id: "resolved",
    label: i18n.t("history.metrics.resolved"),
    value: String(metrics.resolvedAlerts),
    detail: i18n.tPlural({ key: "history.metrics.inSessions", count: metrics.sessionCount }),
  };
}

function durationMetric(metrics: UsageMetricsResult, i18n: HistoryContext): MetricView {
  const { t } = i18n;
  const seconds = metrics.meanReviewSeconds;
  return {
    id: "duration",
    label: t("history.metrics.duration"),
    value: seconds === null ? t("history.noValue") : formatDuration(seconds, t),
    detail: t(seconds === null ? "history.metrics.noClosed" : "history.metrics.durationDetail"),
  };
}

function errorsMetric(metrics: UsageMetricsResult, i18n: HistoryContext): MetricView {
  const { t } = i18n;
  const rate = metrics.realErrorRate;
  const total = metrics.resolvedAlerts;
  return {
    id: "errors",
    label: t("history.metrics.errors"),
    value: rate === null ? t("history.noValue") : i18n.format.percent(rate),
    detail:
      rate === null
        ? t("history.metrics.noResolved")
        : t("history.metrics.errorsDetail", { count: metrics.realErrorCount, total }),
  };
}

/** Las tres métricas del mockup; sin datos muestran «—» y explican por qué. */
export function toMetricViews(metrics: UsageMetricsResult, i18n: HistoryContext): MetricView[] {
  return [
    resolvedMetric(metrics, i18n),
    durationMetric(metrics, i18n),
    errorsMetric(metrics, i18n),
  ];
}
