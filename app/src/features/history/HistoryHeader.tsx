import { Button } from "../../components/atoms/Button";
import { ErrorMessage } from "../../components/molecules/ErrorMessage";
import { SelectField } from "../../components/molecules/SelectField";
import { MetricsStrip } from "../../components/organisms/MetricsStrip";
import { useI18n } from "../../i18n/i18nContext";
import type { HistoryResult } from "../../services/engine/historyTypes";
import type { QueryState } from "../engine/useEngineQuery";
import { toMetricViews } from "./historyPresentation";
import styles from "./HistoryPage.module.css";
import { useHistoryExport } from "./useHistoryExport";

const PERIOD_DAYS = [7, 30, 90] as const;

interface HistoryHeaderProps {
  readonly days: number;
  readonly state: QueryState<HistoryResult>;
  readonly onDaysChange: (days: number) => void;
}

/** Título, periodo, «Exportar registro (CSV)» y las métricas de uso del periodo. */
export function HistoryHeader({ days, state, onDaysChange }: HistoryHeaderProps) {
  const i18n = useI18n();
  const { t } = i18n;
  const exporter = useHistoryExport(days);
  const hasSessions = state.status === "ready" && state.data.sessions.length > 0;
  return (
    <div className={styles.header}>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>{t("history.title")}</h1>
        <SelectField
          isCompact
          label={t("history.periodLabel")}
          value={String(days)}
          options={PERIOD_DAYS.map((value) => ({
            value: String(value),
            label: t("history.period", { days: value }),
          }))}
          onChange={(value) => {
            onDaysChange(Number(value));
          }}
        />
        <Button size="md" icon="download" disabled={!hasSessions} onClick={exporter.exportCsv}>
          {t("history.export")}
        </Button>
      </div>
      {exporter.hasFailed && (
        <ErrorMessage
          tone="neutral"
          what={t("history.exportFailed.what")}
          why={t("history.exportFailed.why")}
          todo={t("history.exportFailed.todo")}
          primaryAction={{ label: t("history.retry"), onClick: exporter.exportCsv }}
        />
      )}
      {state.status === "ready" && (
        <MetricsStrip
          label={t("history.metrics.label")}
          metrics={toMetricViews(state.data.metrics, i18n)}
        />
      )}
    </div>
  );
}
