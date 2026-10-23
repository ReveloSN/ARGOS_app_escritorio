import { createContext, useContext } from "react";

import type { DecisionsResult } from "../../services/engine/reviewTypes";
import type { SendReviewResult } from "../../services/engine/sendTypes";

/** Borrador revisado actual: solo existe después de que el motor lo revisa. */
export interface SendState {
  readonly review: SendReviewResult | null;
  readonly showReview: (review: SendReviewResult) => void;
  readonly discardReview: () => void;
  readonly updateDecisions: (decisions: DecisionsResult) => void;
}

export const SendContext = createContext<SendState | null>(null);

export function useSendReview(): SendState {
  const state = useContext(SendContext);
  if (!state) throw new Error("Falta SendProvider en la raíz de la app.");
  return state;
}
