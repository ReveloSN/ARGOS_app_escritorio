import { useEffect, useState } from "react";

// El mockup oculta la confirmación a los 5 s; «Deshacer» sigue disponible con Ctrl Z.
export const NOTICE_DURATION_MS = 5000;

interface NoticeContent {
  readonly message: string;
  /** Si la acción confirmada se puede deshacer (una decisión, no una copia). */
  readonly isUndoable: boolean;
}

export interface TimedNotice extends NoticeContent {
  readonly isVisible: boolean;
  readonly show: (message: string, isUndoable?: boolean) => void;
}

const NO_NOTICE: NoticeContent = { message: "", isUndoable: false };

/** Confirmación breve tras una acción (CLAUDE.md §9, feedback): se muestra y se oculta sola. */
export function useTimedNotice(): TimedNotice {
  const [content, setContent] = useState(NO_NOTICE);
  const [isVisible, setIsVisible] = useState(false);
  // Cada aviso nuevo reinicia la cuenta, aunque el anterior siga visible.
  const [showCount, setShowCount] = useState(0);
  useEffect(() => {
    if (showCount === 0) return undefined;
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, NOTICE_DURATION_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [showCount]);
  const show = (message: string, isUndoable = false) => {
    setContent({ message, isUndoable });
    setIsVisible(true);
    setShowCount((count) => count + 1);
  };
  return { ...content, isVisible, show };
}
