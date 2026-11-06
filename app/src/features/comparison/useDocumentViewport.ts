import { useRef, useState } from "react";

/** Parte visible del documento, de 0 a 1, para el minimapa. */
export interface Viewport {
  readonly top: number;
  readonly height: number;
}

function viewportOf(element: HTMLElement): Viewport {
  const height = element.scrollHeight
    ? Math.min(1, element.clientHeight / element.scrollHeight)
    : 1;
  const max = element.scrollHeight - element.clientHeight;
  const ratio = max > 0 ? element.scrollTop / max : 0;
  return { top: ratio * (1 - height), height };
}

/** Qué parte del texto unificado se está viendo, para que el minimapa la marque. */
export function useDocumentViewport() {
  const body = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<Viewport>({ top: 0, height: 1 });
  const onScroll = () => {
    if (body.current) setViewport(viewportOf(body.current));
  };
  return { body, viewport, onScroll };
}
