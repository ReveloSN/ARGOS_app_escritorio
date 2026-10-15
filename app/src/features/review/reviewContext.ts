import { createContext, useContext } from "react";

import type { ReviewResult } from "../../services/engine/reviewTypes";

/** Revisión actual: solo existe después de que el motor devuelve resultados reales. */
export interface ReviewState {
  readonly review: ReviewResult | null;
  readonly showReview: (review: ReviewResult) => void;
  readonly discardReview: () => void;
}

export const ReviewContext = createContext<ReviewState | null>(null);

export function useReview(): ReviewState {
  const state = useContext(ReviewContext);
  if (!state) throw new Error("Falta ReviewProvider en la raíz de la app.");
  return state;
}
