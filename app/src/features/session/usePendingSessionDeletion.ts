import { useEffect, useRef, useState } from "react";

import type { ReviewResult } from "../../services/engine/reviewTypes";
import { useEngineServices } from "../engine/EngineServicesContext";
import { useReview } from "../review/reviewContext";
import { DeletionQueue } from "./deletionQueue";

export interface PendingSessionDeletion {
  /** La sesión eliminada que aún se puede recuperar, o null. */
  readonly deleted: ReviewResult | null;
  readonly schedule: () => void;
  readonly undo: () => void;
}

function useDeletionQueue(onChange: (pending: ReviewResult | null) => void): DeletionQueue {
  const { reviews } = useEngineServices();
  const queue = useRef(
    new DeletionQueue({ deleteSession: (id) => reviews.deleteReview(id), onChange }),
  );
  useEffect(() => {
    const current = queue.current;
    return () => {
      current.flush();
    };
  }, []);
  return queue.current;
}

/**
 * Eliminar con deshacer: la sesión sale de la vista al instante y el motor la borra al vencer el
 * plazo. Vive en la raíz porque la sesión eliminada deja de tener un selector donde mostrar el aviso.
 */
export function usePendingSessionDeletion(): PendingSessionDeletion {
  const { review, showReview, discardReview } = useReview();
  const [deleted, setDeleted] = useState<ReviewResult | null>(null);
  const queue = useDeletionQueue(setDeleted);
  const schedule = () => {
    if (!review) return;
    queue.schedule(review);
    discardReview();
  };
  const undo = () => {
    const restored = queue.undo();
    if (restored) showReview(restored);
  };
  return { deleted, schedule, undo };
}
