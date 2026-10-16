import type { DecisionState } from "../../components/atoms/DecisionTag";
import { FilterControl, type FilterOption } from "../../components/molecules/FilterControl";
import { useI18n } from "../../i18n/i18nContext";
import type { TranslationKey } from "../../i18n/translate";
import type { ReviewResult, RiskLevelValue } from "../../services/engine/reviewTypes";
import {
  activeFacetCount,
  FACET_NAMES,
  filesOf,
  NO_FILTERS,
  toggleOption,
  type AlertFilters,
  type FacetName,
} from "./alertFilters";
import { entityTypeLabel } from "./alertPresentation";
import styles from "./AlertsTab.module.css";

const RISKS: readonly RiskLevelValue[] = ["high", "medium", "low"];
const STATES: readonly DecisionState[] = ["pending", "correct", "error", "ignored"];
const FACET_LABELS: Readonly<Record<FacetName, TranslationKey>> = {
  risks: "filters.risk",
  types: "filters.type",
  files: "filters.file",
  states: "filters.state",
};

interface AlertFiltersBarProps {
  readonly review: ReviewResult;
  readonly filters: AlertFilters;
  readonly visibleCount: number;
  readonly onChange: (filters: AlertFilters) => void;
}

/** Filtros combinables (faceted): riesgo, tipo, archivo y estado, con cuántas alertas quedan. */
export function AlertFiltersBar({ review, filters, visibleCount, onChange }: AlertFiltersBarProps) {
  const { t } = useI18n();
  const options: Readonly<Record<FacetName, readonly FilterOption[]>> = {
    risks: RISKS.map((risk) => ({ value: risk, label: t(`risk.${risk}`) })),
    types: [...new Set(review.alerts.map((alert) => alert.entityType))].map((type) => ({
      value: type,
      label: entityTypeLabel(type, t),
    })),
    files: [...new Set(review.alerts.flatMap(filesOf))].map((file) => ({
      value: file,
      label: file,
    })),
    states: STATES.map((state) => ({ value: state, label: t(`decision.${state}`) })),
  };
  const summary = (facet: FacetName) => {
    const selected: readonly string[] = filters[facet];
    const labels = options[facet].filter((option) => selected.includes(option.value));
    const value = labels.length
      ? labels.map((option) => option.label).join(", ")
      : t("filters.all");
    return t("filters.summary", { name: t(FACET_LABELS[facet]), value });
  };
  return (
    <div className={styles.filters}>
      <span className={styles.filtersLabel}>{t("filters.label")}</span>
      {FACET_NAMES.map((facet) => (
        <FilterControl
          key={facet}
          name={t(FACET_LABELS[facet])}
          summary={summary(facet)}
          options={options[facet]}
          selected={filters[facet]}
          onToggle={(value) => {
            onChange(toggleOption(filters, facet, value));
          }}
          onClear={() => {
            onChange({ ...filters, [facet]: [] });
          }}
        />
      ))}
      {activeFacetCount(filters) > 0 && (
        <button
          type="button"
          className={styles.clearFilters}
          onClick={() => {
            onChange({ ...NO_FILTERS, query: filters.query });
          }}
        >
          {t("filters.clear")}
        </button>
      )}
      <span className={styles.grow} />
      <span className={styles.showing}>
        {t("filters.showing", { visible: visibleCount, total: review.alerts.length })}
      </span>
    </div>
  );
}
