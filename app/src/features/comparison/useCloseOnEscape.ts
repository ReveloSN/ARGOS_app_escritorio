import { useShortcuts } from "../keyboard/useShortcuts";

// Un menú o un diálogo abierto usa Esc para cerrarse: ese Esc no es para la comparación.
const OPEN_OVERLAY = '[role="menu"], [role="dialog"]';

/** Esc cierra la comparación, salvo que haya un menú o un diálogo abiertos. */
export function useCloseOnEscape(onClose: () => void): void {
  useShortcuts([
    {
      key: "Escape",
      run: () => {
        if (!document.querySelector(OPEN_OVERLAY)) onClose();
      },
    },
  ]);
}
