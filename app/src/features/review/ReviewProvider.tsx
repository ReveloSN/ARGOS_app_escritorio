import { useMemo, useState, type ReactNode } from "react";

import type { ReviewResult } from "../../services/engine/reviewTypes";
import { ReviewContext, type ReviewState } from "./reviewContext";

// Sin revisión al iniciar: la app arranca en Inicio, sin sesión activa ni contadores.
export function ReviewProvider({ children }: { readonly children: ReactNode }) {
  const [review, setReview] = useState<ReviewResult | null>(null);

  const state = useMemo<ReviewState>(
    () => ({
      review,
      showReview: setReview,
      discardReview: () => {
        setReview(null);
      },
    }),
    [review],
  );
  return <ReviewContext.Provider value={state}>{children}</ReviewContext.Provider>;
}
