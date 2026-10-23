import { RiskTag } from "../../components/atoms/RiskTag";
import { EmptyState } from "../../components/molecules/EmptyState";
import { joinClassNames } from "../../components/joinClassNames";
import { useI18n } from "../../i18n/i18nContext";
import type { ComparisonResult } from "../../services/engine/comparisonTypes";
import { describeLocation, entityTypeLabel } from "../alerts/alertPresentation";
import type { AlertDecisions } from "../alerts/useAlertDecisions";
import { DECISION_LABELS } from "../alerts/useAlertDecisions";
import styles from "./Compare.module.css";
import {
  inconsistencyColumns,
  inconsistencyRows,
  type InconsistencyCell,
} from "./inconsistencyRows";
import { ItemDetail } from "./ItemDetail";
import { inconsistencyDetail } from "./itemDetails";
import type { ComparisonView } from "./useComparisonView";

interface InconsistenciesViewProps {
  readonly comparison: ComparisonResult;
  readonly view: ComparisonView;
  readonly decisions: AlertDecisions;
}

function Cell({ cell }: { cell: InconsistencyCell | undefined }) {
  const { t } = useI18n();
  if (!cell)
    return <div className={styles.cellMissing}>{t("comparison.inconsistencies.notFound")}</div>;
  return (
    <div className={joinClassNames(styles.cell, cell.isOdd && styles.cellOdd)}>
      <span className={styles.cellValue}>
        {cell.isOdd && <span aria-label={t("comparison.inconsistencies.odd")}>≠ </span>}
        {cell.value}
      </span>
      <span className={styles.cellSource}>{describeLocation(cell.occurrence.location, t)}</span>
    </div>
  );
}

/** «Buscar inconsistencias»: cada dato encontrado y qué dice de él cada documento. */
export function InconsistenciesView({ comparison, view, decisions }: InconsistenciesViewProps) {
  const { t } = useI18n();
  const documents = comparison.documents
    .filter((doc) => doc.status === "read")
    .map((doc) => doc.name);
  const columns = inconsistencyColumns(documents, comparison.inconsistencies);
  const rows = inconsistencyRows(comparison.inconsistencies, columns);
  if (!rows.length) {
    return (
      <EmptyState
        icon="check"
        isReassuring
        title={t("comparison.inconsistencies.emptyTitle")}
        description={t("comparison.inconsistencies.emptyDescription")}
      />
    );
  }
  const selected = comparison.inconsistencies.find((alert) => alert.number === view.selected);
  const decisionOf = (number: number) =>
    comparison.decisions.decisions.find((item) => item.alertNumber === number);
  return (
    <div className={styles.versions}>
      <div className={styles.tableWrap}>
        <p className={styles.intro}>
          {t("comparison.inconsistencies.intro", { data: rows.length, documents: columns.length })}
        </p>
        <div
          role="table"
          className={styles.table}
          style={{
            gridTemplateColumns: `minmax(0, 1.4fr) repeat(${String(columns.length)}, minmax(0, 1fr))`,
          }}
        >
          <div role="row" className={styles.tableRow}>
            <span role="columnheader" className={styles.tableHead}>
              {t("comparison.inconsistencies.data")}
            </span>
            {columns.map((name) => (
              <span key={name} role="columnheader" title={name} className={styles.tableHead}>
                {name}
              </span>
            ))}
          </div>
          {rows.map((row) => {
            const decision = decisionOf(row.alert.number);
            return (
              <div
                key={row.alert.number}
                role="row"
                aria-selected={view.selected === row.alert.number}
                className={joinClassNames(
                  styles.tableRow,
                  styles.tableBodyRow,
                  view.selected === row.alert.number && styles.rowSelected,
                )}
                onClick={() => {
                  view.select(row.alert.number);
                }}
              >
                <div role="cell" className={styles.dataCell}>
                  <RiskTag level={row.alert.risk} />
                  <span className={styles.dataName}>
                    {entityTypeLabel(row.alert.entityType, t)}
                  </span>
                  <span className={styles.cellSource}>
                    {t("comparison.inconsistencies.noConfirmed")}
                  </span>
                  {decision && (
                    <span className={styles.itemStatus}>{t(DECISION_LABELS[decision.kind])}</span>
                  )}
                </div>
                {row.cells.map((cell, index) => (
                  <div key={columns[index]} role="cell">
                    <Cell cell={cell} />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        <p className={styles.legendNote}>{t("comparison.inconsistencies.legend")}</p>
      </div>
      <aside className={styles.aside}>
        {selected && (
          <ItemDetail
            content={inconsistencyDetail(selected, t)}
            decision={decisionOf(selected.number)}
            decisions={decisions}
          />
        )}
      </aside>
    </div>
  );
}
