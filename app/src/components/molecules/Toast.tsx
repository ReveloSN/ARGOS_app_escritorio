import { useI18n } from "../../i18n/i18nContext";
import { Icon } from "../atoms/Icon";
import { Kbd, MODIFIER_KEY } from "../atoms/Kbd";
import { joinClassNames } from "../joinClassNames";
import styles from "./Toast.module.css";

const UNDO_SHORTCUT = [MODIFIER_KEY, "Z"];

interface ToastProps {
  readonly message: string;
  readonly visible: boolean;
  /** Sin acción para deshacer, la confirmación no muestra el botón. */
  readonly onUndo?: (() => void) | undefined;
}

/** Confirmación al decidir con «Deshacer» a mano (CLAUDE.md §9, feedback). */
export function Toast({ message, visible, onUndo }: ToastProps) {
  const { t } = useI18n();

  return (
    <div role="status" className={joinClassNames(styles.toast, visible && styles.visible)}>
      <Icon name="check" size="md" />
      <span>{message}</span>
      {onUndo && (
        <button type="button" className={styles.undo} onClick={onUndo} tabIndex={visible ? 0 : -1}>
          {t("actions.undo")}
          <Kbd keys={UNDO_SHORTCUT} variant="inline" />
        </button>
      )}
    </div>
  );
}
