import { useEffect, useState } from "react";

import { hasOpenModal, MODAL_SELECTOR } from "../../components/openModal";

/** La propia puerta lleva esta marca para no contarse como «otro» diálogo. */
export const GATE_MARK = "data-account-gate";
const OTHER_MODAL = `${MODAL_SELECTOR}:not([${GATE_MARK}])`;

/** Si hay otro diálogo modal abierto (búsqueda, Primeros pasos…): la puerta espera a que se cierre. */
export function useOtherModalOpen(): boolean {
  const [isOpen, setOpen] = useState(() => hasOpenModal(OTHER_MODAL));
  useEffect(() => {
    const check = () => {
      setOpen(hasOpenModal(OTHER_MODAL));
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["role", "aria-modal"],
    });
    return () => {
      observer.disconnect();
    };
  }, []);
  return isOpen;
}
