import { joinClassNames } from "../../components/joinClassNames";
import { useI18n } from "../../i18n/i18nContext";
import type { TranslationKey } from "../../i18n/translate";
import { isRetired, type FactRow } from "./factRows";
import styles from "./Facts.module.css";
import type { FactChanges } from "./useFactChanges";
import type { FactsView } from "./useFactsView";

interface RowAction {
  readonly id: string;
  readonly label: TranslationKey;
  readonly title: TranslationKey;
  readonly isDanger?: boolean;
  readonly run: () => void;
}

interface FactRowActionsProps {
  readonly row: FactRow;
  readonly view: FactsView;
  readonly changes: FactChanges;
}

function actionsFor({ row, view, changes }: FactRowActionsProps): RowAction[] {
  if (row.kind === "pending") {
    const confirm = () => {
      view.startEditing(row.key, row.pending.values[0] ?? "");
    };
    return [
      {
        id: "confirm",
        label: "facts.actions.confirm",
        title: "facts.actionTitles.confirm",
        run: confirm,
      },
    ];
  }
  const { fact } = row;
  if (isRetired(fact)) {
    const restore = () => {
      changes.restore(fact);
    };
    return [
      {
        id: "restore",
        label: "facts.actions.restore",
        title: "facts.actionTitles.restore",
        run: restore,
      },
    ];
  }
  return [
    {
      id: "edit",
      label: "facts.actions.edit",
      title: "facts.actionTitles.edit",
      run: () => {
        view.startEditing(row.key, fact.value);
      },
    },
    {
      id: "retire",
      label: "facts.actions.retire",
      title: "facts.actionTitles.retire",
      isDanger: true,
      run: () => {
        changes.retire(fact);
      },
    },
  ];
}

/** Editar y Retirar; Restaurar si está retirado; Confirmar valor si aún no está confirmado. */
export function FactRowActions(props: FactRowActionsProps) {
  const { t } = useI18n();
  return actionsFor(props).map((action) => (
    <button
      key={action.id}
      type="button"
      title={t(action.title)}
      className={joinClassNames(styles.action, action.isDanger && styles.actionDanger)}
      onClick={(event) => {
        event.stopPropagation();
        action.run();
      }}
    >
      {t(action.label)}
    </button>
  ));
}
