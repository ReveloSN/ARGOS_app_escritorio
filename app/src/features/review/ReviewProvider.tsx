import { useMemo, useState, type ReactNode } from "react";

import type { ReviewResult } from "../../services/engine/reviewTypes";
import { ResultsViewProvider } from "../alerts/ResultsViewProvider";
import { ReviewContext, type ReadingProgress, type ReviewState } from "./reviewContext";

// Sin revisión al iniciar: la app arranca en Inicio, sin sesión activa ni contadores.
export function ReviewProvider({ children }: { readonly children: ReactNode }) {
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [readingProgress, setReadingProgress] = useState<ReadingProgress | null>(null);

  const state = useMemo<ReviewState>(
    () => ({
      review,
      showReview: setReview,
      discardReview: () => {
        setReview(null);
      },
      updateDecisions: (decisions) => {
        setReview((current) => current && { ...current, decisions });
      },
      updateSession: (session) => {
        setReview((current) => current && { ...current, session });
      },
      readingProgress,
      setReadingProgress,
    }),
    [review, readingProgress],
  );
  // La vista de Resultados (pestaña, filtros, selección) vuelve a empezar con cada revisión.
  return (
    <ReviewContext.Provider value={state}>
      <ResultsViewProvider sessionId={review?.session.id}>{children}</ResultsViewProvider>
    </ReviewContext.Provider>
  );
}
