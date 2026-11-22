export const MODAL_SELECTOR = "[role='dialog'][aria-modal='true']";

/** Si hay un diálogo modal abierto: lo que está detrás no debe responder al teclado. */
export function hasOpenModal(selector: string = MODAL_SELECTOR): boolean {
  return document.querySelector(selector) !== null;
}
