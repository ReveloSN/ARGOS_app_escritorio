import { useEffect, useRef, useState } from "react";

import type {
  ComparisonGateway,
  ComparisonModeValue,
  ComparisonProgressEvent,
  ComparisonResult,
} from "../../services/engine/comparisonTypes";
import { useEngineServices } from "../engine/EngineServicesContext";
import { useReview } from "../review/reviewContext";
import { useComparison } from "./comparisonContext";

const VERSION_FILE_COUNT = 2;
const NAME_SEPARATOR = " · ";

/** Avance visible: archivos leídos y, después, pares comparados. */
export interface ComparisonProgress {
  readonly read: number;
  readonly files: number;
  readonly compared: number;
  readonly pairs: number;
}

export type StartStatus =
  | { readonly kind: "idle" }
  | { readonly kind: "running"; readonly progress: ComparisonProgress }
  | { readonly kind: "failed" };

/** Dos archivos son dos versiones; tres o más se comparan todos contra todos (matriz). */
export function modeForFiles(count: number): ComparisonModeValue {
  return count === VERSION_FILE_COUNT ? "versions" : "contract_annexes";
}

function advance(progress: ComparisonProgress, event: ComparisonProgressEvent): ComparisonProgress {
  if (event.kind === "document_finished") return { ...progress, read: progress.read + 1 };
  if (event.kind === "pair_compared") {
    return { ...progress, compared: event.position + 1, pairs: event.total };
  }
  return progress;
}

interface StartHandlers {
  readonly setStatus: (status: StartStatus) => void;
  readonly show: (comparison: ComparisonResult) => void;
}

/** Avisa el avance de la lectura y de cada par mientras el motor trabaja. */
function trackProgress(fileCount: number, setStatus: StartHandlers["setStatus"]) {
  let progress: ComparisonProgress = { read: 0, files: fileCount, compared: 0, pairs: 0 };
  setStatus({ kind: "running", progress });
  return (event: ComparisonProgressEvent) => {
    progress = advance(progress, event);
    setStatus({ kind: "running", progress });
  };
}

/** Una comparación en marcha: el avance, el resultado o el fallo; igual para archivos nuevos o del expediente. */
function runComparison(
  fileCount: number,
  start: (onProgress: (event: ComparisonProgressEvent) => void) => Promise<ComparisonResult>,
  handlers: StartHandlers,
): void {
  start(trackProgress(fileCount, handlers.setStatus)).then(
    (result) => {
      // Sin esto, al cerrar la comparación volvería a verse el avance de la anterior.
      handlers.setStatus({ kind: "idle" });
      handlers.show(result);
    },
    () => {
      handlers.setStatus({ kind: "failed" });
    },
  );
}

function uploaded(gateway: ComparisonGateway, files: readonly File[]) {
  const name = files.map((file) => file.name).join(NAME_SEPARATOR);
  const mode = modeForFiles(files.length);
  return (onProgress: (event: ComparisonProgressEvent) => void) =>
    gateway.startComparison({ name, mode, files, onProgress });
}

function fromSession(gateway: ComparisonGateway, sessionId: string, documents: readonly string[]) {
  const name = documents.join(NAME_SEPARATOR);
  const mode = modeForFiles(documents.length);
  return (onProgress: (event: ComparisonProgressEvent) => void) =>
    gateway.startSessionComparison({ sessionId, name, mode, documents, onProgress });
}

/** Solo actúa mientras siga vigente la comparación que lo pidió. */
function guarded(handlers: StartHandlers, isCurrent: () => boolean): StartHandlers {
  return {
    setStatus: (status) => {
      if (isCurrent()) handlers.setStatus(status);
    },
    show: (result) => {
      if (isCurrent()) handlers.show(result);
    },
  };
}

/**
 * Lo que se compara es de la sesión activa: al cambiar de sesión o salir de Comparar, lo que el
 * motor devuelva después se descarta y la pantalla vuelve a pedir documentos.
 */
function useComparisonTurn(setStatus: StartHandlers["setStatus"]): () => () => boolean {
  const { review } = useReview();
  const sessionId = review?.session.id;
  const latest = useRef(0);
  useEffect(
    () => () => {
      latest.current += 1;
      setStatus({ kind: "idle" });
    },
    [sessionId, setStatus],
  );
  return () => {
    const request = ++latest.current;
    return () => request === latest.current;
  };
}

/** «Elegir documentos» o «Comparar los elegidos» del expediente, con el avance mientras el motor trabaja. */
export function useStartComparison() {
  const { comparisons } = useEngineServices();
  const { showComparison } = useComparison();
  const [status, setStatus] = useState<StartStatus>({ kind: "idle" });
  const begin = useComparisonTurn(setStatus);
  const handlers = () => guarded({ setStatus, show: showComparison }, begin());
  const start = (files: readonly File[]) => {
    runComparison(files.length, uploaded(comparisons, files), handlers());
  };
  const startFromSession = (sessionId: string, documents: readonly string[]) => {
    runComparison(documents.length, fromSession(comparisons, sessionId, documents), handlers());
  };
  return { status, start, startFromSession };
}
