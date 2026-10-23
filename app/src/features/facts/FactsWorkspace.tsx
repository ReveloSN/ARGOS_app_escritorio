import { useI18n } from "../../i18n/i18nContext";
import type { FactsResult } from "../../services/engine/factTypes";
import { isReadOnly } from "../alerts/alertDecisions";
import { useShortcuts } from "../keyboard/useShortcuts";
import { FactAside } from "./FactAside";
import { factRows } from "./factRows";
import styles from "./Facts.module.css";
import { FactsEmpty } from "./FactsEmpty";
import { FactsFeedback } from "./FactsFeedback";
import type { FactsTabProps } from "./FactsTab";
import { FactsTable } from "./FactsTable";
import { FactsToolbar } from "./FactsToolbar";
import type { FactChanges } from "./useFactChanges";
import { useFactsView } from "./useFactsView";

interface FactsWorkspaceProps extends FactsTabProps {
  readonly result: FactsResult;
  readonly changes: FactChanges;
}

/** Tabla de datos con filtros y, al lado, qué documentos contradicen el dato elegido. */
export function FactsWorkspace({ review, result, changes, ...adding }: FactsWorkspaceProps) {
  const { t } = useI18n();
  const rows = factRows(result);
  const view = useFactsView(rows);
  const readOnly = isReadOnly(review);
  useShortcuts([{ key: "z", withModifier: true, run: changes.undo }], result.canUndo && !readOnly);
  if (!rows.length && !adding.isAdding) {
    return <FactsEmpty onAdd={readOnly ? undefined : adding.onAdd} />;
  }
  return (
    <div className={styles.workspace}>
      <div className={styles.main}>
        <div className={styles.toolbar}>
          <p className={styles.intro}>{t("facts.intro")}</p>
          <FactsToolbar rows={rows} filter={view.filter} onFilter={view.setFilter} />
        </div>
        <FactsTable
          view={view}
          changes={changes}
          readOnly={readOnly}
          isAdding={adding.isAdding}
          onAddDone={adding.onAddDone}
        />
        <FactsFeedback changes={changes} canUndo={result.canUndo && !readOnly} />
      </div>
      <FactAside row={view.selected} sessionId={review.session.id} notice={changes.notice} />
    </div>
  );
}
