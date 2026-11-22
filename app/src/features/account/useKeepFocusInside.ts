import { useEffect, type RefObject } from "react";

const ENABLED_CONTROL = "input:not(:disabled), button:not(:disabled)";

function isFocusLostFrom(root: HTMLElement): boolean {
  const active = document.activeElement;
  return !active || !root.contains(active) || active.matches(":disabled");
}

/**
 * El foco no se queda en un control que desaparece («Entendido») ni en uno que se deshabilita
 * (el envío en curso): vuelve al primer control disponible de la puerta.
 */
export function useKeepFocusInside(dialog: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const root = dialog.current;
    if (root && isFocusLostFrom(root)) root.querySelector<HTMLElement>(ENABLED_CONTROL)?.focus();
  });
}
