import { useState } from "react";

import { Icon } from "../../components/atoms/Icon";
import { RiskTag } from "../../components/atoms/RiskTag";
import { joinClassNames } from "../../components/joinClassNames";
import { useI18n } from "../../i18n/i18nContext";
import type { ComparisonResult } from "../../services/engine/comparisonTypes";
import { useShortcuts } from "../keyboard/useShortcuts";
import { shownChanges } from "./changeFilters";
import styles from "./Compare.module.css";
import { comparisonMatrix, type MatrixCell } from "./comparisonMatrix";
import { MatrixPairPanel } from "./MatrixPairPanel";
import type { ComparisonView } from "./useComparisonView";

interface MatrixViewProps {
  readonly comparison: ComparisonResult;
  readonly view: ComparisonView;
}

function CellContent({ cell }: { cell: MatrixCell }) {
  const { t, tPlural } = useI18n();
  if (!cell.highestRisk) {
    return (
      <span className={styles.matrixClean}>
        <Icon name="check" size="xs" />
        {t("comparison.matrix.noDifferences")}
      </span>
    );
  }
  return (
    <>
      <span className={styles.matrixCount}>
        <RiskTag level={cell.highestRisk} compact />
        {cell.count}
      </span>
      <span className={styles.matrixLabel}>
        {tPlural({ key: "comparison.matrix.changes", count: cell.count })}
      </span>
    </>
  );
}

/** Matriz de 3 o más documentos: una celda por par, con sus cambios y su mayor riesgo. */
export function MatrixView({ comparison, view }: MatrixViewProps) {
  const { t } = useI18n();
  const matrix = comparisonMatrix(comparison, view.filters.ignored);
  const [pairIndex, setPairIndex] = useState(view.pairIndex);
  useShortcuts([
    {
      key: "Enter",
      run: () => {
        view.openPair(pairIndex);
      },
    },
  ]);
  const withDifferences = comparison.pairs.filter(
    (pair) => shownChanges(pair.changes, view.filters.ignored).length,
  ).length;
  return (
    <div className={styles.versions}>
      <div className={styles.tableWrap}>
        <p className={styles.intro}>
          {t("comparison.matrix.intro", {
            documents: matrix.documents.length,
            pairs: comparison.pairs.length,
            different: withDifferences,
          })}
        </p>
        <div
          role="grid"
          aria-label={t("comparison.matrix.label")}
          className={styles.matrix}
          style={{
            gridTemplateColumns: `minmax(0, 1fr) repeat(${String(matrix.documents.length)}, minmax(0, 1fr))`,
          }}
        >
          <span className={styles.tableHead}>{t("comparison.matrix.axis")}</span>
          {matrix.documents.map((name) => (
            <span key={name} title={name} className={styles.tableHead}>
              {name}
            </span>
          ))}
          {matrix.documents.map((row, rowIndex) => [
            <span key={row} title={row} className={styles.tableHead}>
              {row}
            </span>,
            ...(matrix.cells[rowIndex] ?? []).map((cell, columnIndex) =>
              cell ? (
                <button
                  key={`${row}-${String(columnIndex)}`}
                  type="button"
                  role="gridcell"
                  aria-selected={cell.pairIndex === pairIndex}
                  className={joinClassNames(
                    styles.matrixCell,
                    cell.pairIndex === pairIndex && styles.rowSelected,
                  )}
                  onClick={() => {
                    setPairIndex(cell.pairIndex);
                  }}
                >
                  <CellContent cell={cell} />
                </button>
              ) : (
                <span
                  key={`${row}-${String(columnIndex)}`}
                  role="gridcell"
                  className={styles.matrixSame}
                >
                  {t("comparison.matrix.same")}
                </span>
              ),
            ),
          ])}
        </div>
      </div>
      <aside className={styles.aside}>
        <MatrixPairPanel
          comparison={comparison}
          pairIndex={pairIndex}
          onOpen={() => {
            view.openPair(pairIndex);
          }}
        />
      </aside>
    </div>
  );
}
