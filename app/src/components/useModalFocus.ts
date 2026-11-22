import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react";

// Lo deshabilitado no recibe el foco: no puede ser el borde donde Tab da la vuelta.
const FOCUSABLE =
  "button:not(:disabled), input:not(:disabled), [href], select:not(:disabled), textarea:not(:disabled)";

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

function isFocusLost(): boolean {
  const active = document.activeElement;
  return !active || active === document.body;
}

function liveElement(element: Element | null): HTMLElement | null {
  const isLive = element instanceof HTMLElement && element !== document.body && element.isConnected;
  return isLive ? element : null;
}

/**
 * Devuelve el foco a quien abrió el diálogo, o al reemplazo si ya no existe, pero solo si el foco
 * se perdió: si otro control ya lo tomó (la puerta de la cuenta, por ejemplo), no se le quita.
 */
function restoreFocus(opener: Element | null, fallback?: () => HTMLElement | null): void {
  if (isFocusLost()) (liveElement(opener) ?? fallback?.())?.focus();
}

/**
 * Un diálogo modal con el foco bien llevado: Tab no sale de él y, al cerrarse, el foco vuelve a
 * quien lo abrió. Devuelve el manejador de teclas que va en el diálogo.
 */
export function useModalFocus(
  dialog: RefObject<HTMLElement | null>,
  fallback?: () => HTMLElement | null,
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
        if (!isOpen.current) restoreFocus(opener, fallback);
      }, 0);
    };
  }, [opener, fallback]);
  return (event) => {
    if (event.key === "Tab") keepFocusInside(event, dialog.current);
  };
}
