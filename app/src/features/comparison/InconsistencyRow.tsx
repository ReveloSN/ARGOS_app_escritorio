import { RiskTag } from "../../components/atoms/RiskTag";
import { joinClassNames } from "../../components/joinClassNames";
import { useI18n } from "../../i18n/i18nContext";
import type { DecisionResult } from "../../services/engine/reviewTypes";
import { describeLocation, entityTypeLabel } from "../alerts/alertPresentation";
import { DECISION_LABELS } from "../alerts/useAlertDecisions";
import styles from "./Compare.module.css";
import type { InconsistencyCell, InconsistencyRow as Row } from "./inconsistencyRows";

interface InconsistencyRowProps {
  readonly row: Row;
  readonly columns: readonly string[];
  readonly decision: DecisionResult | undefined;
  readonly isSelected: boolean;
  readonly onSelect: (number: number) => void;
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

/** Una fila de «Buscar inconsistencias»: el botón del dato la elige con Tab y Enter, y con el clic en cualquier celda. */
export function InconsistencyRow(props: InconsistencyRowProps) {
  const { t } = useI18n();
  const { row, decision } = props;
  const select = () => {
    props.onSelect(row.alert.number);
  };
  return (
    <div
      role="row"
      aria-selected={props.isSelected}
      className={joinClassNames(
        styles.tableRow,
        styles.tableBodyRow,
        props.isSelected && styles.rowSelected,
      )}
      onClick={select}
    >
      <div role="cell" className={styles.dataCell}>
        <button
          type="button"
          data-change-row=""
          aria-current={props.isSelected}
          className={styles.dataSelect}
          onClick={select}
        >
          <RiskTag level={row.alert.risk} />
          <span className={styles.dataName}>{entityTypeLabel(row.alert.entityType, t)}</span>
        </button>
        <span className={styles.cellSource}>
          {row.confirmed
            ? t("comparison.inconsistencies.confirmed", { value: row.confirmed.value })
            : t("comparison.inconsistencies.noConfirmed")}
        </span>
        {decision && <span className={styles.itemStatus}>{t(DECISION_LABELS[decision.kind])}</span>}
      </div>
      {row.cells.map((cell, index) => (
        <div key={props.columns[index]} role="cell">
          <Cell cell={cell} />
        </div>
      ))}
    </div>
  );
}
