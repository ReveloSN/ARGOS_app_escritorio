import { useMemo, useState, type ReactNode } from "react";

import type { SendReviewResult } from "../../services/engine/sendTypes";
import { SendContext, type SendState } from "./sendContext";

// Sin borrador al iniciar: la pantalla empieza vacía y pide elegir el correo.
export function SendProvider({ children }: { readonly children: ReactNode }) {
  const [review, setReview] = useState<SendReviewResult | null>(null);
  const state = useMemo<SendState>(
    () => ({
      review,
      showReview: setReview,
      discardReview: () => {
        setReview(null);
      },
      // Una respuesta tardía es del borrador que la pidió: si ya se cambió de borrador, se ignora.
      updateDecisions: (decisions, reviewId) => {
        setReview((current) => (current?.id === reviewId ? { ...current, decisions } : current));
      },
    }),
    [review],
  );
  return <SendContext.Provider value={state}>{children}</SendContext.Provider>;
}
