import { useState } from "react";

import { useI18n } from "../../i18n/i18nContext";
import type { ComparisonResult } from "../../services/engine/comparisonTypes";
import { useShortcuts } from "../keyboard/useShortcuts";
import { shownChanges } from "./changeFilters";
import styles from "./Compare.module.css";
import { comparisonMatrix } from "./comparisonMatrix";
import { MatrixGrid } from "./MatrixGrid";
import { MatrixPairPanel } from "./MatrixPairPanel";
import type { ComparisonView } from "./useComparisonView";

interface MatrixViewProps {
  readonly comparison: ComparisonResult;
  readonly view: ComparisonView;
}

/** Matriz de 3 o más documentos: una celda por par (triángulo superior), solo con su conteo. */
export function MatrixView({ comparison, view }: MatrixViewProps) {
  const { t, tPlural } = useI18n();
  const matrix = comparisonMatrix(comparison, view.filters.ignored);
  const [pairIndex, setPairIndex] = useState(view.pairIndex);
  const openSelected = () => {
    view.openPair(pairIndex);
  };
  useShortcuts([{ key: "Enter", run: openSelected }]);
  const withDifferences = comparison.pairs.filter(
    (pair) => shownChanges(pair.changes, view.filters.ignored).length,
  ).length;
  return (
    <div className={styles.versions}>
      <div className={styles.tableWrap}>
        <p className={styles.intro}>
          {t("comparison.matrix.intro", {
            documents: tPlural({
              key: "comparison.matrix.documents",
              count: matrix.documents.length,
            }),
            pairs: tPlural({ key: "comparison.matrix.pairs", count: comparison.pairs.length }),
            different: tPlural({ key: "comparison.matrix.different", count: withDifferences }),
          })}
        </p>
        <MatrixGrid
          matrix={matrix}
          selectedPair={pairIndex}
          onSelectPair={setPairIndex}
          onOpenDocument={view.openAgainstAll}
        />
      </div>
      <aside className={styles.aside}>
        <MatrixPairPanel comparison={comparison} pairIndex={pairIndex} onOpen={openSelected} />
      </aside>
    </div>
  );
}
