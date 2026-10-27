import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";

import styles from "./ModalDialog.module.css";

interface ModalDialogProps {
  readonly title: string;
  readonly children: ReactNode;
  /** Botones de la acción; el primero con foco se elige con `autoFocus` en el propio botón. */
  readonly actions: ReactNode;
  readonly onClose: () => void;
}

const FOCUSABLE = "button, input, [href], select, textarea";

/** Tab y Mayús+Tab dan la vuelta dentro del diálogo en vez de salir de él. */
function keepFocusInside(event: KeyboardEvent<HTMLElement>, container: HTMLElement | null) {
  const items = [...(container?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
  const first = items[0];
  const last = items[items.length - 1];
  const [edge, opposite] = event.shiftKey ? [first, last] : [last, first];
  if (document.activeElement !== edge) return;
  event.preventDefault();
  opposite?.focus();
}

/** Diálogo modal pequeño: Esc lo cierra, Tab no sale de él y el foco vuelve a quien lo abrió. */
export function ModalDialog({ title, children, actions, onClose }: ModalDialogProps) {
  const titleId = useId();
  const dialog = useRef<HTMLDivElement>(null);
  // Se lee al renderizar, antes de que un hijo con `autoFocus` se quede con el foco.
  const [opener] = useState(() => document.activeElement);
  // Diferido y solo si el diálogo ya no está en la página: el modo estricto de React desmonta y
  // monta cada efecto una vez en desarrollo, y ese desmontaje de prueba no debe quitarle el foco al campo.
  useEffect(() => {
    return () => {
      window.setTimeout(() => {
        if (!document.getElementById(titleId) && opener instanceof HTMLElement) opener.focus();
      }, 0);
    };
  }, [opener, titleId]);

  const handleKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key === "Tab") keepFocusInside(event, dialog.current);
  };

  // Fuera del encabezado y de la barra lateral: un diálogo modal no pertenece a esos puntos de referencia.
  return createPortal(
    <div className={styles.backdrop}>
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={styles.dialog}
        onKeyDown={handleKey}
      >
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <div className={styles.body}>{children}</div>
        <div className={styles.actions}>{actions}</div>
      </div>
    </div>,
    document.body,
  );
}
