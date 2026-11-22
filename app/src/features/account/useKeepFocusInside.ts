import { useEffect, useRef, type RefObject } from "react";

const FIRST_FIELD = "input:not(:disabled)";

function isFocusLostFrom(root: HTMLElement): boolean {
  const active = document.activeElement;
  return !active || !root.contains(active) || active.matches(":disabled");
}

function isTyping(): boolean {
  return document.activeElement instanceof HTMLInputElement;
}

function needsFocus(form: HTMLElement, hasFinished: boolean): boolean {
  return hasFinished || isFocusLostFrom(form.closest<HTMLElement>("[role='dialog']") ?? form);
}

/** Con una petición en curso, el formulario (no accionable); si no, el primer campo. */
function restingPlace(form: HTMLElement, isBusy: boolean): HTMLElement | null {
  return isBusy ? form : form.querySelector<HTMLElement>(FIRST_FIELD);
}

/** Si la petición acaba de terminar y la persona no está escribiendo (cayó un error, por ejemplo). */
function hasJustFinished(wasBusy: { current: boolean }, isBusy: boolean): boolean {
  const hasFinished = wasBusy.current && !isBusy && !isTyping();
  wasBusy.current = isBusy;
  return hasFinished;
}

/**
 * El foco no se queda en un control que desaparece («Entendido») ni en uno que se deshabilita (el
 * envío en curso). La app nunca lo manda a un botón: con una petición en curso descansa en el
 * formulario; al terminar con un error, o al cerrar el aviso, en el primer campo.
 */
export function useKeepFocusInside(dialog: RefObject<HTMLElement | null>, isBusy: boolean): void {
  const wasBusy = useRef(false);
  useEffect(() => {
    const form = dialog.current?.querySelector("form");
    const hasFinished = hasJustFinished(wasBusy, isBusy);
    if (form && needsFocus(form, hasFinished)) restingPlace(form, isBusy)?.focus();
  });
}
