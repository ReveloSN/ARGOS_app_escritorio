import { useI18n } from "../../i18n/i18nContext";
import type { ComparisonResult } from "../../services/engine/comparisonTypes";
import { DecisionFeedback } from "../alerts/DecisionFeedback";
import styles from "./Compare.module.css";
import { useComparison } from "./comparisonContext";
import { CompareTop } from "./CompareTop";
import { InconsistenciesView } from "./InconsistenciesView";
import { MatrixView } from "./MatrixView";
import { scopedList } from "./scopedList";
import { useCloseOnEscape } from "./useCloseOnEscape";
import { useComparisonView, type ComparisonView } from "./useComparisonView";
import { useWorkspaceShortcuts } from "./useWorkspaceShortcuts";
import { VersionsView } from "./VersionsView";

interface ComparisonWorkspaceProps {
  readonly comparison: ComparisonResult;
}

function useCrumb(comparison: ComparisonResult, view: ComparisonView): string {
  const { t } = useI18n();
  const pair = comparison.pairs[view.pairIndex];
  if (view.tab === "inconsistencies") return t("comparison.crumb.inconsistencies");
  if (view.tab === "matrix")
    return t("comparison.crumb.matrix", { count: comparison.documents.length });
  if (view.scope.against.kind === "all")
    return t("comparison.scope.allHeading", { base: view.scope.base });
  return t("comparison.crumb.versions", {
    first: pair?.firstDocument ?? "",
    second: pair?.secondDocument ?? "",
  });
}

/** Una comparación con resultados: modos, vistas, decisiones y atajos de teclado. */
export function ComparisonWorkspace({ comparison }: ComparisonWorkspaceProps) {
  const { closeComparison } = useComparison();
  const view = useComparisonView(comparison);
  const list = scopedList(comparison, view);
  const decisions = useWorkspaceShortcuts(comparison, view, list);
  useCloseOnEscape(closeComparison);
  const crumb = useCrumb(comparison, view);
  const pair = comparison.pairs[view.pairIndex];
  return (
    <div className={styles.workspace}>
      <CompareTop
        comparison={comparison}
        view={view}
        list={list}
        crumb={crumb}
        onClose={closeComparison}
      />
      {view.tab === "versions" && pair && (
        <VersionsView
          comparison={comparison}
          pair={pair}
          list={list}
          view={view}
          decisions={decisions}
        />
      )}
      {view.tab === "inconsistencies" && (
        <InconsistenciesView comparison={comparison} view={view} decisions={decisions} />
      )}
      {view.tab === "matrix" && <MatrixView comparison={comparison} view={view} />}
      <DecisionFeedback decisions={decisions} />
    </div>
  );
}
