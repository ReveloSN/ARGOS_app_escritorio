import { useEffect, useRef, type RefObject } from "react";

// Si se cancela (la figura se oculta a mitad), no llega animationend: también se limpia.
const SETTLING_EVENTS = ["animationend", "animationcancel"] as const;

/** Un saltito: quitar, forzar un reflow y volver a poner la marca, para que la animación
 *  reinicie aunque la anterior no se haya limpiado (p. ej., la ventana no pintaba). */
function poke(figure: HTMLElement): void {
  delete figure.dataset.poked;
  figure.getBoundingClientRect();
  figure.dataset.poked = "";
}

/** Marca `data-poked` al tocar y lo quita cuando termina la animación de la propia figura. */
function listenForPokes(figure: HTMLElement): () => void {
  const onClick = () => {
    poke(figure);
  };
  const settle = (event: Event) => {
    if (event.target === figure) delete figure.dataset.poked;
  };
  figure.addEventListener("click", onClick);
  SETTLING_EVENTS.forEach((type) => {
    figure.addEventListener(type, settle);
  });
  return () => {
    figure.removeEventListener("click", onClick);
    SETTLING_EVENTS.forEach((type) => {
      figure.removeEventListener(type, settle);
    });
  };
}

/**
 * Al tocar la figura, un saltito, una sola vez. Es una reacción al puntero, no un control:
 * no hace nada más, por eso no es un botón ni se anuncia. Con movimiento reducido las
 * duraciones son 0 y no se ve.
 */
export function usePokeReaction(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const figure = ref.current;
    return figure ? listenForPokes(figure) : undefined;
  }, [ref]);
}

/**
 * Salta una vez cuando `moment` cambia a algo que merece atención (`isNoteworthy`). Al montarse
 * no salta: solo reacciona a un cambio real, nunca simula actividad.
 */
export function useReactionOnChange(
  ref: RefObject<HTMLElement | null>,
  moment: string,
  isNoteworthy: boolean,
): void {
  const previous = useRef(moment);
  useEffect(() => {
    const hasChanged = previous.current !== moment;
    previous.current = moment;
    if (hasChanged && isNoteworthy && ref.current) poke(ref.current);
  }, [ref, moment, isNoteworthy]);
}
