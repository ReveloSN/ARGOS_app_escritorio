import { useEffect } from "react";

import { EmptyState } from "../../components/molecules/EmptyState";
import { useI18n } from "../../i18n/i18nContext";
import type { ComparisonResult } from "../../services/engine/comparisonTypes";
import type { AlertDecisions } from "../alerts/useAlertDecisions";
import styles from "./Compare.module.css";
import { confirmedFactFor } from "./confirmedFacts";
import { InconsistenciesIntro, InconsistenciesLegend } from "./InconsistenciesNotes";
import { inconsistencyColumns, inconsistencyRows } from "./inconsistencyRows";
import { InconsistencyRow } from "./InconsistencyRow";
import { ItemDetail } from "./ItemDetail";
import { useConfirmedFacts } from "./useConfirmedFacts";
import { inconsistencyDetail } from "./itemDetails";
import type { ComparisonView } from "./useComparisonView";

interface InconsistenciesViewProps {
  readonly comparison: ComparisonResult;
  readonly view: ComparisonView;
  readonly decisions: AlertDecisions;
}

/** «Buscar inconsistencias»: cada dato encontrado y qué dice de él cada documento. */
export function InconsistenciesView({ comparison, view, decisions }: InconsistenciesViewProps) {
  const { t } = useI18n();
  const facts = useConfirmedFacts();
  const documents = comparison.documents
    .filter((doc) => doc.status === "read")
    .map((doc) => doc.name);
  const columns = inconsistencyColumns(documents, comparison.inconsistencies);
  const rows = inconsistencyRows(comparison.inconsistencies, columns, (alert) =>
    confirmedFactFor(alert, facts),
  );
  const selected = comparison.inconsistencies.find((alert) => alert.number === view.selected);
  const firstNumber = rows[0]?.alert.number;
  // Al llegar desde «Versiones» la selección es de un cambio: se pasa a la primera inconsistencia.
  useEffect(() => {
    if (!selected && firstNumber !== undefined) view.select(firstNumber);
  }, [selected, firstNumber, view]);
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
  const decisionOf = (number: number) =>
    comparison.decisions.decisions.find((item) => item.alertNumber === number);
  return (
    <div className={styles.versions}>
      <div className={styles.tableWrap}>
        <InconsistenciesIntro
          dataCount={rows.length}
          documentCount={columns.length}
          hasConfirmedFacts={facts.length > 0}
        />
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
          {rows.map((row) => (
            <InconsistencyRow
              key={row.alert.number}
              row={row}
              columns={columns}
              decision={decisionOf(row.alert.number)}
              isSelected={view.selected === row.alert.number}
              onSelect={view.select}
            />
          ))}
        </div>
        <InconsistenciesLegend isConfirmedReference={rows.some((row) => row.confirmed)} />
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
