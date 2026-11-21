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
  /** Oculta «Ctrl Z» cuando ese atajo no deshace lo que el aviso confirma. */
  readonly hasUndoShortcut?: boolean;
  /** Dentro de un bloque (la decisión del detalle) en lugar de flotar sobre el contenido. */
  readonly isInline?: boolean;
  /** Ocupa siempre su hueco: aparecer o irse no mueve lo que hay debajo. */
  readonly reservesSpace?: boolean;
}

function toastClassName(state: {
  readonly isInline: boolean;
  readonly reservesSpace: boolean;
  readonly visible: boolean;
}): string {
  return joinClassNames(
    styles.toast,
    state.isInline && styles.inline,
    state.reservesSpace && styles.reserved,
    state.visible && styles.visible,
  );
}

/** Confirmación al decidir con «Deshacer» a mano (CLAUDE.md §9, feedback). */
export function Toast({
  message,
  visible,
  onUndo,
  hasUndoShortcut = true,
  isInline = false,
  reservesSpace = false,
}: ToastProps) {
  const { t } = useI18n();

  return (
    <div role="status" className={toastClassName({ isInline, reservesSpace, visible })}>
      <Icon name="check" size="md" />
      <span className={styles.message}>{message}</span>
      {onUndo && (
        <button type="button" className={styles.undo} onClick={onUndo} tabIndex={visible ? 0 : -1}>
          {t("actions.undo")}
          {hasUndoShortcut && <Kbd keys={UNDO_SHORTCUT} variant="inline" />}
        </button>
      )}
    </div>
  );
}
