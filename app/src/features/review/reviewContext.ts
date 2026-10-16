import { createContext, useContext } from "react";

import type {
  DecisionsResult,
  ReviewResult,
  SessionResult,
} from "../../services/engine/reviewTypes";

/** Cuántos archivos lleva leídos el motor en la revisión que se está creando. */
export interface ReadingProgress {
  readonly done: number;
  readonly total: number;
}

/** Revisión actual: solo existe después de que el motor devuelve resultados reales. */
export interface ReviewState {
  readonly review: ReviewResult | null;
  readonly showReview: (review: ReviewResult) => void;
  readonly discardReview: () => void;
  readonly updateDecisions: (decisions: DecisionsResult) => void;
  readonly updateSession: (session: SessionResult) => void;
  readonly readingProgress: ReadingProgress | null;
  readonly setReadingProgress: (progress: ReadingProgress | null) => void;
}

export const ReviewContext = createContext<ReviewState | null>(null);

export function useReview(): ReviewState {
  const state = useContext(ReviewContext);
  if (!state) throw new Error("Falta ReviewProvider en la raíz de la app.");
  return state;
}
