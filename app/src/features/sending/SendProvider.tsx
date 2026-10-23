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
      updateDecisions: (decisions) => {
        setReview((current) => current && { ...current, decisions });
      },
    }),
    [review],
  );
  return <SendContext.Provider value={state}>{children}</SendContext.Provider>;
}
