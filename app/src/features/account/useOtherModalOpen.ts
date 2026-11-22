import { useEffect, useReducer } from "react";

import { hasOpenModal, MODAL_SELECTOR } from "../../components/openModal";

/** La propia puerta lleva esta marca para no contarse como «otro» diálogo. */
export const GATE_MARK = "data-account-gate";
const OTHER_MODAL = `${MODAL_SELECTOR}:not([${GATE_MARK}])`;

/**
 * Si hay otro diálogo modal abierto (búsqueda, Primeros pasos…): la puerta espera a que se cierre.
 * Se lee en cada render, para que la puerta nunca tape un diálogo ya abierto, y se vuelve a leer
 * cuando el documento cambia.
 */
export function useOtherModalOpen(isEnabled: boolean): boolean {
  const [, refresh] = useReducer((count: number) => count + 1, 0);
  useEffect(() => {
    if (!isEnabled) return undefined;
    const observer = new MutationObserver(refresh);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["role", "aria-modal"],
    });
    return () => {
      observer.disconnect();
    };
  }, [isEnabled]);
  return isEnabled && hasOpenModal(OTHER_MODAL);
}
