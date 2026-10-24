import type { MenuAction } from "../../components/molecules/ActionMenu";
import type { I18n } from "../../i18n/i18nContext";
import type { SessionListItem } from "./sessionList";

const ACTIVE_ICON = "check_circle";
const OTHER_ICON = "radio_button_unchecked";

function detailOf(item: SessionListItem, i18n: I18n): string {
  const { tPlural, t, format } = i18n;
  const documents = tPlural({ key: "sessionMenu.documents", count: item.documentCount });
  const pending = tPlural({ key: "sessionMenu.pending", count: item.pendingCount });
  const status = item.isClosed ? t("sessionMenu.closed") : pending;
  const date = item.createdAt ? [format.date(new Date(item.createdAt))] : [];
  return [documents, status, ...date].join(" · ");
}

export interface ManageHandlers {
  readonly onNew: () => void;
  readonly onRename: () => void;
  readonly onDelete: () => void;
}

/** Nueva sesión, Renombrar y Eliminar, separadas de la lista de sesiones. */
export function manageActions(t: I18n["t"], handlers: ManageHandlers): readonly MenuAction[] {
  return [
    { id: "new", icon: "add", label: t("sessionMenu.new"), onSelect: handlers.onNew },
    { id: "rename", icon: "edit", label: t("sessionMenu.rename"), onSelect: handlers.onRename },
    { id: "delete", icon: "delete", label: t("sessionMenu.delete"), onSelect: handlers.onDelete },
  ].map((action, index) => ({ ...action, isMuted: true, startsGroup: index === 0 }));
}

/** Una opción por sesión; la activa lleva ícono además del color y `aria-checked`. */
export function sessionActions(
  items: readonly SessionListItem[],
  i18n: I18n,
  onSwitch: (sessionId: string) => void,
): readonly MenuAction[] {
  return items.map((item) => ({
    id: item.id,
    icon: item.isActive ? ACTIVE_ICON : OTHER_ICON,
    label: item.name,
    detail: detailOf(item, i18n),
    isChecked: item.isActive,
    isEmphasized: item.isActive,
    onSelect: () => {
      onSwitch(item.id);
    },
  }));
}
