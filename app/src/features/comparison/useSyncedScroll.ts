import { useRef, useState, type RefObject } from "react";

// Mientras un panel arrastra al otro, el desplazamiento que eso provoca no debe devolverse.
const RELEASE_DELAY_MS = 60;

/** Parte visible del documento B, de 0 a 1, para el minimapa. */
export interface Viewport {
  readonly top: number;
  readonly height: number;
}

function ratioOf(element: HTMLElement): number {
  const max = element.scrollHeight - element.clientHeight;
  return max > 0 ? element.scrollTop / max : 0;
}

function viewportOf(element: HTMLElement): Viewport {
  const height = element.scrollHeight
    ? Math.min(1, element.clientHeight / element.scrollHeight)
    : 1;
  return { top: ratioOf(element) * (1 - height), height };
}

type PanelRef = RefObject<HTMLDivElement | null>;

interface ScrollLink {
  readonly isLocked: { current: boolean };
  readonly onViewport: (viewport: Viewport) => void;
  readonly viewportSource: PanelRef;
}

function follow(from: PanelRef, to: PanelRef, link: ScrollLink) {
  return () => {
    const source = from.current;
    const target = to.current;
    if (!source || !target || link.isLocked.current) return;
    link.isLocked.current = true;
    target.scrollTop = ratioOf(source) * (target.scrollHeight - target.clientHeight);
    link.onViewport(viewportOf(link.viewportSource.current ?? source));
    setTimeout(() => {
      link.isLocked.current = false;
    }, RELEASE_DELAY_MS);
  };
}

/** Desplazamiento sincronizado de los dos paneles, en proporción (mockup Comparar). */
export function useSyncedScroll() {
  const first = useRef<HTMLDivElement>(null);
  const second = useRef<HTMLDivElement>(null);
  const isLocked = useRef(false);
  const [viewport, setViewport] = useState<Viewport>({ top: 0, height: 1 });
  const link: ScrollLink = { isLocked, onViewport: setViewport, viewportSource: second };
  return {
    first,
    second,
    viewport,
    onFirstScroll: follow(first, second, link),
    onSecondScroll: follow(second, first, link),
  };
}
