import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import type { ComparisonResult } from "../../services/engine/comparisonTypes";
import { useReview } from "../review/reviewContext";
import { ComparisonContext, type ComparisonState } from "./comparisonContext";

// Cuántas comparaciones cerradas se recuerdan para volver a abrirlas.
const RECENT_LIMIT = 5;

function without(list: readonly ComparisonResult[], id: string): ComparisonResult[] {
  return list.filter((item) => item.id !== id);
}

/**
 * Lo que se compara pertenece a la sesión activa: al pasar de una sesión a otra, sea desde el
 * selector o desde Historial, Comparar vuelve a empezar. Quedarse sin sesión o abrir la primera
 * no descarta nada.
 */
function useResetOnSessionSwitch(reset: () => void): void {
  const { review } = useReview();
  const sessionId = review?.session.id;
  const previous = useRef(sessionId);
  // `reset` cambia en cada render; se usa la última sin que dispare el efecto.
  const latestReset = useRef(reset);
  useEffect(() => {
    latestReset.current = reset;
  });
  useEffect(() => {
    const before = previous.current;
    previous.current = sessionId;
    if (before !== undefined && sessionId !== undefined && before !== sessionId) {
      latestReset.current();
    }
  }, [sessionId]);
}

// Sin comparación al iniciar: la pantalla Comparar empieza vacía y pide elegir documentos.
export function ComparisonProvider({ children }: { readonly children: ReactNode }) {
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [recent, setRecent] = useState<readonly ComparisonResult[]>([]);
  useResetOnSessionSwitch(() => {
    setComparison(null);
    setRecent([]);
  });
  const state = useMemo<ComparisonState>(
    () => ({
      comparison,
      recent,
      showComparison: (shown) => {
        setRecent((list) => without(list, shown.id));
        setComparison(shown);
      },
      closeComparison: () => {
        if (!comparison) return;
        setRecent((list) => [comparison, ...without(list, comparison.id)].slice(0, RECENT_LIMIT));
        setComparison(null);
      },
      updateDecisions: (decisions) => {
        setComparison((current) => current && { ...current, decisions });
      },
    }),
    [comparison, recent],
  );
  return <ComparisonContext.Provider value={state}>{children}</ComparisonContext.Provider>;
}
