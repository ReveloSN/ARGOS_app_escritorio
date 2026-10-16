import type { AlertGroup } from "../../components/organisms/AlertList";
import { useI18n } from "../../i18n/i18nContext";
import type { AlertResult, ReviewResult, RiskLevelValue } from "../../services/engine/reviewTypes";
import { decisionStateOf } from "./alertDecisions";
import { matchesFilters, type AlertFilters, type FilterableAlert } from "./alertFilters";
import { alertSearchText, toAlertRow, type Translate } from "./alertPresentation";

const RISK_ORDER: readonly RiskLevelValue[] = ["high", "medium", "low"];

export interface VisibleAlerts {
  readonly visible: readonly AlertResult[];
  /** Las visibles agrupadas por riesgo, como en el mockup de Resultados. */
  readonly groups: readonly AlertGroup[];
  readonly hiddenCount: number;
}

/** Qué alertas quedan con los filtros y la búsqueda actuales. */
export function useVisibleAlerts(review: ReviewResult, filters: AlertFilters): VisibleAlerts {
  const { t } = useI18n();
  const items: FilterableAlert[] = review.alerts.map((alert) => ({
    alert,
    state: decisionStateOf(review, alert.number),
    searchText: alertSearchText(alert, t),
  }));
  const visible = items.filter((item) => matchesFilters(item, filters));
  const groups = groupByRisk(visible, t);
  return {
    visible: visible.map((item) => item.alert),
    groups,
    hiddenCount: items.length - visible.length,
  };
}

function groupByRisk(items: readonly FilterableAlert[], t: Translate): AlertGroup[] {
  return RISK_ORDER.map((risk) => ({
    id: risk,
    label: t(`risk.${risk}Long`),
    rows: items
      .filter((item) => item.alert.risk === risk)
      .map((item) => toAlertRow(item.alert, t, item.state)),
  })).filter((group) => group.rows.length > 0);
}
