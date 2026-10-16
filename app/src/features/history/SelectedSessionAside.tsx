import type { ReviewResult } from "../../services/engine/reviewTypes";
import { useEngineServices } from "../engine/EngineServicesContext";
import { useEngineQuery } from "../engine/useEngineQuery";
import { SessionDecisionsAside } from "./SessionDecisionsAside";

interface SelectedSessionAsideProps {
  readonly sessionId: string;
  readonly onOpenReview: (review: ReviewResult) => void;
  readonly onOpenAlert: (review: ReviewResult, number: number) => void;
}

/** Carga la sesión seleccionada del historial para mostrar sus decisiones. */
export function SelectedSessionAside({
  sessionId,
  onOpenReview,
  onOpenAlert,
}: SelectedSessionAsideProps) {
  const { reviews } = useEngineServices();
  const query = useEngineQuery(sessionId, () => reviews.openReview(sessionId));
  return (
    <SessionDecisionsAside
      state={query.state}
      onRetry={query.reload}
      onOpenReview={onOpenReview}
      onOpenAlert={onOpenAlert}
    />
  );
}
