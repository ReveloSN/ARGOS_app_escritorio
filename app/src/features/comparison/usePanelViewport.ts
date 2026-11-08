import { useLayoutEffect, type RefObject } from "react";

function observePanelLayout(element: HTMLDivElement, fit: () => void) {
  if (typeof ResizeObserver === "undefined") return undefined;
  const observer = new ResizeObserver(fit);
  observer.observe(element.parentElement?.parentElement ?? element);
  return observer;
}

/** El espacio disponible depende de la posición real del panel, incluso al hacer zoom. */
export function usePanelViewport(isOpen: boolean, panel: RefObject<HTMLDivElement | null>) {
  useLayoutEffect(() => {
    const element = panel.current;
    if (!isOpen || !element) return undefined;
    const fit = () => {
      const available = Math.max(0, window.innerHeight - element.getBoundingClientRect().top);
      element.style.setProperty("--options-panel-available-height", `${String(available)}px`);
    };
    fit();
    const observer = observePanelLayout(element, fit);
    window.addEventListener("resize", fit);
    window.addEventListener("scroll", fit, true);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", fit);
      window.removeEventListener("scroll", fit, true);
    };
  }, [isOpen, panel]);
}
