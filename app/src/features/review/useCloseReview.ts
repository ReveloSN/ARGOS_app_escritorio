import { useState } from "react";

import { useEngineServices } from "../engine/EngineServicesContext";
import { useReview } from "./reviewContext";

export interface ReviewCloser {
  readonly close: () => void;
  readonly hasFailed: boolean;
}

/** «Cerrar revisión»: la revisión queda en el historial y pasa a ser de solo lectura. */
export function useCloseReview(onClosed: (sessionId: string) => void): ReviewCloser {
  const { reviews } = useEngineServices();
  const { review, updateSession } = useReview();
  const [hasFailed, setHasFailed] = useState(false);
  const close = () => {
    if (!review) return;
    setHasFailed(false);
    reviews.closeReview(review.session.id).then(
      (session) => {
        updateSession(session);
        onClosed(session.id);
      },
      () => {
        setHasFailed(true);
      },
    );
  };
  return { close, hasFailed };
}
