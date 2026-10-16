import { useEffect, useState } from "react";

import type {
  DocumentReadResult,
  ReviewProgressEvent,
  ReviewResult,
} from "../../services/engine/reviewTypes";
import { useEngineServices } from "../engine/EngineServicesContext";
import { applyProgress, finishedCount, startReading, type ReadingState } from "./readingProgress";
import { useReview } from "./reviewContext";

export interface ReviewStart {
  readonly start: (name: string, files: readonly File[]) => void;
  /** Avance de la lectura mientras el motor trabaja; null cuando no hay una lectura en curso. */
  readonly reading: ReadingState | null;
  readonly hasFailed: boolean;
  /** Cómo se leyó cada archivo, para «Confirmar lectura»; null antes de leer. */
  readonly documents: readonly DocumentReadResult[] | null;
  readonly reset: () => void;
}

/** Lee y compara los archivos en el motor, mostrando el avance archivo por archivo. */
export function useStartReview(): ReviewStart {
  const { reviews } = useEngineServices();
  const reading = useReadingState();
  const outcome = useReviewOutcome();
  const start = (name: string, files: readonly File[]) => {
    outcome.clearFailure();
    reading.begin(files.map((file) => file.name));
    reviews
      .startReview({ name, files, onProgress: reading.advance })
      .then(outcome.show, outcome.fail)
      .finally(reading.end);
  };
  const { hasFailed, documents, reset } = outcome;
  return { start, reading: reading.state, hasFailed, documents, reset };
}

/** Lo que devolvió el motor: la revisión leída o el aviso de que no se pudo completar. */
function useReviewOutcome() {
  const { showReview } = useReview();
  const failure = useFailureFlag();
  const [documents, setDocuments] = useState<readonly DocumentReadResult[] | null>(null);
  const show = (review: ReviewResult) => {
    showReview(review);
    setDocuments(review.documents);
  };
  const reset = () => {
    setDocuments(null);
  };
  return { ...failure, documents, show, reset };
}

function useFailureFlag() {
  const [hasFailed, setHasFailed] = useState(false);
  const fail = () => {
    setHasFailed(true);
  };
  const clearFailure = () => {
    setHasFailed(false);
  };
  return { hasFailed, fail, clearFailure };
}

function useReadingState() {
  const { setReadingProgress } = useReview();
  const [state, setState] = useState<ReadingState | null>(null);
  // La barra superior muestra el mismo avance: «Analizando · 3 de 5 archivos».
  useEffect(() => {
    setReadingProgress(state && { done: finishedCount(state), total: state.files.length });
  }, [state, setReadingProgress]);
  return {
    state,
    begin: (names: readonly string[]) => {
      setState(startReading(names, Date.now()));
    },
    advance: (event: ReviewProgressEvent) => {
      setState((current) => current && applyProgress(current, event, Date.now()));
    },
    end: () => {
      setState(null);
    },
  };
}
