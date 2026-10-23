import { useI18n } from "../../i18n/i18nContext";
import type { ComparisonResult } from "../../services/engine/comparisonTypes";
import { DecisionFeedback } from "../alerts/DecisionFeedback";
import { useDecisionShortcuts } from "../alerts/useDecisionShortcuts";
import { visibleChanges } from "./changeFilters";
import styles from "./Compare.module.css";
import { CompareHeader } from "./CompareHeader";
import { COMPARE_TABS } from "./compareTabs";
import { InconsistenciesView } from "./InconsistenciesView";
import { MatrixView } from "./MatrixView";
import { useComparisonDecisions } from "./useComparisonDecisions";
import { useComparisonView, type ComparisonView } from "./useComparisonView";
import { VersionsToolbar } from "./VersionsToolbar";
import { VersionsView } from "./VersionsView";

interface ComparisonWorkspaceProps {
  readonly comparison: ComparisonResult;
}

/** Los números que recorren J y K en la pestaña actual. */
function navigableNumbers(comparison: ComparisonResult, view: ComparisonView): number[] {
  if (view.tab === "inconsistencies")
    return comparison.inconsistencies.map((alert) => alert.number);
  const pair = comparison.pairs[view.pairIndex];
  return pair ? visibleChanges(pair.changes, view.filters).map((change) => change.number) : [];
}

function useCrumb(comparison: ComparisonResult, view: ComparisonView): string {
  const { t } = useI18n();
  const pair = comparison.pairs[view.pairIndex];
  if (view.tab === "inconsistencies") return t("comparison.crumb.inconsistencies");
  if (view.tab === "matrix")
    return t("comparison.crumb.matrix", { count: comparison.documents.length });
  return t("comparison.crumb.versions", {
    first: pair?.firstDocument ?? "",
    second: pair?.secondDocument ?? "",
  });
}

function useWorkspaceShortcuts(comparison: ComparisonResult, view: ComparisonView) {
  const decisions = useComparisonDecisions();
  const numbers = navigableNumbers(comparison, view);
  const step = (offset: number) => () => {
    const index = view.selected === undefined ? -1 : numbers.indexOf(view.selected);
    const next = numbers[Math.min(Math.max(index + offset, 0), numbers.length - 1)];
    if (next !== undefined) view.select(next);
  };
  useDecisionShortcuts({
    alertNumber: view.tab === "matrix" ? undefined : view.selected,
    decisions,
    onNext: step(1),
    onPrevious: step(-1),
    extra: COMPARE_TABS.map((item) => ({
      key: item.key,
      run: () => {
        view.setTab(item.tab);
      },
    })),
  });
  return decisions;
}

/** Una comparación con resultados: modos, vistas, decisiones y atajos de teclado. */
export function ComparisonWorkspace({ comparison }: ComparisonWorkspaceProps) {
  const view = useComparisonView(comparison);
  const decisions = useWorkspaceShortcuts(comparison, view);
  const crumb = useCrumb(comparison, view);
  const pair = comparison.pairs[view.pairIndex];
  return (
    <div className={styles.workspace}>
      <div className={styles.top}>
        <CompareHeader tab={view.tab} crumb={crumb} onTab={view.setTab} />
        {view.tab === "versions" && pair && (
          <VersionsToolbar pair={pair} filters={view.filters} onFilters={view.setFilters} />
        )}
      </div>
      {view.tab === "versions" && pair && (
        <VersionsView comparison={comparison} pair={pair} view={view} decisions={decisions} />
      )}
      {view.tab === "inconsistencies" && (
        <InconsistenciesView comparison={comparison} view={view} decisions={decisions} />
      )}
      {view.tab === "matrix" && <MatrixView comparison={comparison} view={view} />}
      <DecisionFeedback decisions={decisions} />
    </div>
  );
}
