import type { Ref } from "react";

import { ProgressBar } from "../../components/atoms/ProgressBar";
import { RiskSummary } from "../../components/molecules/RiskSummary";
import { SearchField } from "../../components/molecules/SearchField";
import { useI18n } from "../../i18n/i18nContext";
import type { ReviewResult } from "../../services/engine/reviewTypes";
import { decidedCount } from "./alertDecisions";
import styles from "./AlertsTab.module.css";

export const SEARCH_KEY = "/";

interface AlertsToolbarProps {
  readonly review: ReviewResult;
  readonly query: string;
  readonly searchRef: Ref<HTMLInputElement>;
  readonly onQueryChange: (query: string) => void;
}

/** Cuántas alertas hay por riesgo, cuántas están decididas y «Buscar en alertas». */
export function AlertsToolbar({ review, query, searchRef, onQueryChange }: AlertsToolbarProps) {
  const { t } = useI18n();
  const total = review.alerts.length;
  const decided = decidedCount(review);
  const counts = {
    high: review.alerts.filter((alert) => alert.risk === "high").length,
    medium: review.alerts.filter((alert) => alert.risk === "medium").length,
    low: review.alerts.filter((alert) => alert.risk === "low").length,
  };
  const progress = t("results.decidedProgress", { decided, total });
  return (
    <div className={styles.toolbar}>
      <RiskSummary counts={counts} />
      <span className={styles.progress}>
        <span>
          {t("results.decidedLabel")} <span className={styles.count}>{progress}</span>
        </span>
        <span className={styles.progressBar}>
          <ProgressBar value={total ? decided / total : 0} label={progress} />
        </span>
      </span>
      <span className={styles.grow} />
      <span className={styles.searchField}>
        <SearchField
          label={t("results.searchAlerts")}
          value={query}
          shortcutHint={SEARCH_KEY}
          inputRef={searchRef}
          onChange={onQueryChange}
          onSearch={onQueryChange}
        />
      </span>
    </div>
  );
}
