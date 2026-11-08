import { useEffect, useRef, useState } from "react";

import type {
  DocumentReadResult,
  ReviewProgressEvent,
  ReviewRequest,
  ReviewResult,
} from "../../services/engine/reviewTypes";
import { useEngineServices } from "../engine/EngineServicesContext";
import { applyProgress, finishedCount, startReading, type ReadingState } from "./readingProgress";
import { useReview } from "./reviewContext";

/** «Activar OCR»: archivos a leer con OCR y la lectura anterior que se reemplaza. */
export type ReviewStartOptions = Pick<ReviewRequest, "ocr" | "replaces">;

export interface ReviewStart {
  readonly start: (name: string, files: readonly File[], options?: ReviewStartOptions) => void;
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
  const begin = useCurrentRequest();
  const start = (name: string, files: readonly File[], options: ReviewStartOptions = {}) => {
    const isCurrent = begin();
    // Fuera de la pantalla (p. ej., llega tarde la configuración de OCR) no se empieza nada.
    if (!isCurrent) return;
    outcome.clearFailure();
    // Al releer con OCR se vuelve al avance de lectura hasta tener el resultado nuevo.
    outcome.reset();
    reading.begin(files.map((file) => file.name));
    const answer = onlyIfCurrent(isCurrent, outcome);
    reviews
      .startReview({ name, files, onProgress: onlyWhile(isCurrent, reading.advance), ...options })
      .then(answer.show, answer.fail)
      .finally(onlyWhile(isCurrent, reading.end));
  };
  const { hasFailed, documents, reset } = outcome;
  return { start, reading: reading.state, hasFailed, documents, reset };
}

/**
 * Turno de la lectura en curso. Se pierde al salir de la pantalla (Cancelar, ir a otra
 * sección) o al empezar otra: lo que el motor devuelva después ya no abre la sesión.
 */
function useCurrentRequest(): () => (() => boolean) | null {
  const latest = useRef(0);
  const isMounted = useRef(false);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      latest.current += 1;
    };
  }, []);
  return () => {
    if (!isMounted.current) return null;
    const request = ++latest.current;
    return () => request === latest.current;
  };
}

/** El avance y el fin de una lectura reemplazada no tocan los de la lectura vigente. */
function onlyWhile<T extends unknown[]>(
  isCurrent: () => boolean,
  action: (...args: T) => void,
): (...args: T) => void {
  return (...args) => {
    if (isCurrent()) action(...args);
  };
}

interface Answer {
  readonly show: (review: ReviewResult) => void;
  readonly fail: () => void;
}

/** Solo cuenta la respuesta de la lectura vigente (ver useCurrentRequest). */
function onlyIfCurrent(isCurrent: () => boolean, answer: Answer): Answer {
  return {
    show: (review) => {
      if (isCurrent()) answer.show(review);
    },
    fail: () => {
      if (isCurrent()) answer.fail();
    },
  };
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

/** La barra superior muestra el mismo avance: «Analizando · 3 de 5 archivos». */
function useSharedReadingProgress(state: ReadingState | null) {
  const { setReadingProgress } = useReview();
  useEffect(() => {
    setReadingProgress(state && { done: finishedCount(state), total: state.files.length });
  }, [state, setReadingProgress]);
  // Al salir de la pantalla a mitad de lectura, la barra superior no se queda en «Leyendo…».
  useEffect(
    () => () => {
      setReadingProgress(null);
    },
    [setReadingProgress],
  );
}

function useReadingState() {
  const [state, setState] = useState<ReadingState | null>(null);
  useSharedReadingProgress(state);
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
