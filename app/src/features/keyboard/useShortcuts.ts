import { useEffect, useRef } from "react";

export interface Shortcut {
  /** Tecla tal como la informa el navegador («j», «/», «z»); no distingue mayúsculas. */
  readonly key: string;
  /** Con Ctrl (o ⌘ en macOS). */
  readonly withModifier?: boolean;
  /** También mientras se escribe en un campo (Ctrl N, Ctrl K). */
  readonly isActiveWhileTyping?: boolean;
  readonly run: () => void;
}

const EDITABLE_SELECTOR = "input, textarea, select, [contenteditable='true']";
const MODAL_SELECTOR = "[role='dialog'][aria-modal='true']";

/** De quién son los atajos: de la pantalla (por defecto) o de un diálogo modal. */
export type ShortcutOwner = "screen" | "dialog";

/** Con un diálogo modal abierto, la pantalla de atrás no responde al teclado (E no decide). */
function isBlockedByDialog(owner: ShortcutOwner): boolean {
  return owner === "screen" && document.querySelector(MODAL_SELECTOR) !== null;
}

/** Atajos visibles de los mockups (J K, C E I, /, Ctrl Z…) mientras la vista está montada. */
export function useShortcuts(
  shortcuts: readonly Shortcut[],
  isEnabled = true,
  owner: ShortcutOwner = "screen",
): void {
  const latest = useRef(shortcuts);
  useEffect(() => {
    latest.current = shortcuts;
  });
  useEffect(() => (isEnabled ? listenForShortcuts(latest, owner) : undefined), [isEnabled, owner]);
}

/** Escucha el teclado de toda la ventana; devuelve cómo dejar de escuchar. */
function listenForShortcuts(
  latest: { readonly current: readonly Shortcut[] },
  owner: ShortcutOwner,
): () => void {
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || isBlockedByDialog(owner)) return;
    const shortcut = findShortcut(latest.current, event);
    if (!shortcut) return;
    event.preventDefault();
    shortcut.run();
  };
  window.addEventListener("keydown", onKeyDown);
  return () => {
    window.removeEventListener("keydown", onKeyDown);
  };
}

function findShortcut(shortcuts: readonly Shortcut[], event: KeyboardEvent): Shortcut | undefined {
  const hasModifier = event.ctrlKey || event.metaKey;
  const isTyping = event.target instanceof Element && event.target.matches(EDITABLE_SELECTOR);
  return shortcuts.find(
    (shortcut) =>
      shortcut.key.toLowerCase() === event.key.toLowerCase() &&
      Boolean(shortcut.withModifier) === hasModifier &&
      (!isTyping || shortcut.isActiveWhileTyping === true),
  );
}
