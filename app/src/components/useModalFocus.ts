import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react";

const FOCUSABLE = "button, input, [href], select, textarea";

function focusableIn(container: HTMLElement | null): HTMLElement[] {
  return container ? [...container.querySelectorAll<HTMLElement>(FOCUSABLE)] : [];
}

/** Tab y Mayús+Tab dan la vuelta dentro del diálogo en vez de salir de él. */
export function keepFocusInside(event: KeyboardEvent<HTMLElement>, container: HTMLElement | null) {
  const items = focusableIn(container);
  const first = items[0];
  const last = items[items.length - 1];
  const [edge, opposite] = event.shiftKey ? [first, last] : [last, first];
  if (document.activeElement !== edge) return;
  event.preventDefault();
  opposite?.focus();
}

/**
 * Un diálogo modal con el foco bien llevado: Tab no sale de él y, al cerrarse, el foco vuelve a
 * quien lo abrió. Devuelve el manejador de teclas que va en el diálogo.
 */
export function useModalFocus(
  dialog: RefObject<HTMLElement | null>,
): (event: KeyboardEvent<HTMLElement>) => void {
  // Se lee al renderizar, antes de que un hijo con `autoFocus` se quede con el foco.
  const [opener] = useState(() => document.activeElement);
  const isOpen = useRef(true);
  // Diferido y solo si el diálogo ya no está abierto: el modo estricto de React desmonta y monta
  // cada efecto una vez en desarrollo, y ese desmontaje de prueba no debe quitarle el foco.
  useEffect(() => {
    isOpen.current = true;
    return () => {
      isOpen.current = false;
      window.setTimeout(() => {
        if (!isOpen.current && opener instanceof HTMLElement) opener.focus();
      }, 0);
    };
  }, [opener]);
  return (event) => {
    if (event.key === "Tab") keepFocusInside(event, dialog.current);
  };
}
