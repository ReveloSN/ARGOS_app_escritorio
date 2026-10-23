import { useI18n } from "../../i18n/i18nContext";
import styles from "./Facts.module.css";
import { FactTableRow } from "./FactTableRow";
import { NewFactRow } from "./NewFactRow";
import type { FactChanges } from "./useFactChanges";
import type { FactsView } from "./useFactsView";

interface FactsTableProps {
  readonly view: FactsView;
  readonly changes: FactChanges;
  readonly readOnly: boolean;
  readonly isAdding: boolean;
  readonly onAddDone: () => void;
}

const COLUMNS = ["data", "value", "confirmed", "documents", "actions"] as const;

/** Tabla «Dato · Valor confirmado · Confirmado · Documentos · Acciones» (mockup Expediente). */
export function FactsTable({ view, changes, readOnly, isAdding, onAddDone }: FactsTableProps) {
  const { t } = useI18n();
  return (
    <div role="table" aria-label={t("facts.tableLabel")} className={styles.table}>
      <div role="row" className={styles.row}>
        {COLUMNS.map((column) => (
          <span key={column} role="columnheader" className={styles.head}>
            {t(`facts.columns.${column}`)}
          </span>
        ))}
      </div>
      {isAdding && !readOnly && <NewFactRow onAdd={changes.add} onDone={onAddDone} />}
      {view.visible.map((row) => (
        <FactTableRow key={row.key} row={row} view={view} changes={changes} readOnly={readOnly} />
      ))}
    </div>
  );
}
