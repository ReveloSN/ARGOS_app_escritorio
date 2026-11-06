import { useState } from "react";

import { useEngineServices } from "../engine/EngineServicesContext";
import { useReview } from "../review/reviewContext";

export interface SessionRename {
  readonly rename: (name: string) => Promise<boolean>;
  readonly hasFailed: boolean;
}

/** Cambia el nombre de la sesión activa; el estado de la sesión lo refleja en todas partes. */
export function useSessionRename(): SessionRename {
  const { reviews } = useEngineServices();
  const { review, updateSession } = useReview();
  const [hasFailed, setHasFailed] = useState(false);
  const rename = async (name: string): Promise<boolean> => {
    if (!review) return false;
    try {
      updateSession(await reviews.renameReview(review.session.id, name.trim()));
      setHasFailed(false);
      return true;
    } catch {
      setHasFailed(true);
      return false;
    }
  };
  return { rename, hasFailed };
}
