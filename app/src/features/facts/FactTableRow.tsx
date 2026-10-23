import { Icon } from "../../components/atoms/Icon";
import { joinClassNames } from "../../components/joinClassNames";
import { useI18n } from "../../i18n/i18nContext";
import { entityTypeLabel } from "../alerts/alertPresentation";
import { rowPresentation, type RowPresentation } from "./factPresentation";
import { FactRowActions } from "./FactRowActions";
import type { FactRow } from "./factRows";
import styles from "./Facts.module.css";
import type { FactChanges } from "./useFactChanges";
import type { FactsView } from "./useFactsView";

interface FactTableRowProps {
  readonly row: FactRow;
  readonly view: FactsView;
  readonly changes: FactChanges;
  readonly readOnly: boolean;
}

function useCommit(row: FactRow, view: FactsView, changes: FactChanges) {
  const { t } = useI18n();
  return (draft: string) => {
    view.stopEditing();
    if (row.kind === "fact") {
      changes.edit(row.fact, draft);
      return;
    }
    const { entityType } = row.pending;
    changes.add({ label: entityTypeLabel(entityType, t), entityType, value: draft });
  };
}

function ValueEditor({ view, onCommit }: { view: FactsView; onCommit: (draft: string) => void }) {
  const { t } = useI18n();
  return (
    <input
      // La edición la abre el usuario con «Editar»: el foco va directo al valor.
      autoFocus
      aria-label={t("facts.newValue")}
      className={styles.valueInput}
      value={view.editing?.draft ?? ""}
      onClick={(event) => {
        event.stopPropagation();
      }}
      onChange={(event) => {
        view.setDraft(event.target.value);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" && view.editing?.draft.trim())
          onCommit(view.editing.draft.trim());
        if (event.key === "Escape") view.stopEditing();
      }}
    />
  );
}

interface ValueCellProps {
  readonly row: FactRow;
  readonly view: FactsView;
  readonly shown: RowPresentation;
  readonly onCommit: (draft: string) => void;
}

function ValueCell({ row, view, shown, onCommit }: ValueCellProps) {
  if (view.editing?.key === row.key) return <ValueEditor view={view} onCommit={onCommit} />;
  return (
    <span
      className={joinClassNames(
        styles.value,
        shown.isPending && styles.valuePending,
        shown.isRetired && styles.valueRetired,
      )}
    >
      {shown.value}
    </span>
  );
}

/** Una fila: el dato, su valor (editable en línea), cuándo se confirmó y qué lo contradice. */
export function FactTableRow({ row, view, changes, readOnly }: FactTableRowProps) {
  const texts = useI18n();
  const shown = rowPresentation(row, texts);
  const commit = useCommit(row, view, changes);
  const isSelected = view.selected?.key === row.key;
  return (
    <div
      role="row"
      aria-selected={isSelected}
      className={joinClassNames(
        styles.row,
        styles.bodyRow,
        isSelected && styles.rowSelected,
        shown.isRetired && styles.rowRetired,
      )}
      onClick={() => {
        view.select(row.key);
      }}
    >
      <span role="cell" className={styles.dataCell}>
        <span className={styles.dataName}>{shown.name}</span>
        <span className={styles.dataType}>{shown.type}</span>
      </span>
      <span role="cell" className={styles.cell}>
        <ValueCell row={row} view={view} shown={shown} onCommit={commit} />
      </span>
      <span role="cell" className={styles.confirmed}>
        {shown.confirmed}
      </span>
      <span role="cell" className={joinClassNames(styles.status, styles[shown.statusTone])}>
        <Icon name={shown.statusIcon} size="sm" />
        {shown.statusLabel}
      </span>
      <span role="cell" className={styles.actions}>
        {!readOnly && <FactRowActions row={row} view={view} changes={changes} />}
      </span>
    </div>
  );
}
