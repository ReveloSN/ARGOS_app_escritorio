import { useEffect, type RefObject } from "react";

/** Cierra un menú o panel flotante con Escape o con un clic fuera de él. */
export function useDismiss(ref: RefObject<HTMLElement | null>, onDismiss: () => void): void {
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !ref.current?.contains(event.target)) onDismiss();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [ref, onDismiss]);
}
