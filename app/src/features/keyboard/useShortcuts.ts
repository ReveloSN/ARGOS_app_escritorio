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

/** Atajos visibles de los mockups (J K, C E I, /, Ctrl Z…) mientras la vista está montada. */
export function useShortcuts(shortcuts: readonly Shortcut[], isEnabled = true): void {
  const latest = useRef(shortcuts);
  useEffect(() => {
    latest.current = shortcuts;
  });
  useEffect(() => {
    if (!isEnabled) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      const shortcut = findShortcut(latest.current, event);
      if (!shortcut) return;
      event.preventDefault();
      shortcut.run();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isEnabled]);
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
