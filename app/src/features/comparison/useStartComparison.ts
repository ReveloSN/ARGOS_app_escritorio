import { useState } from "react";

import type {
  ComparisonModeValue,
  ComparisonProgressEvent,
} from "../../services/engine/comparisonTypes";
import { useEngineServices } from "../engine/EngineServicesContext";
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

/** «Elegir documentos»: compara los archivos y muestra el avance mientras el motor trabaja. */
export function useStartComparison() {
  const { comparisons } = useEngineServices();
  const { showComparison } = useComparison();
  const [status, setStatus] = useState<StartStatus>({ kind: "idle" });
  const start = (files: readonly File[]) => {
    let progress: ComparisonProgress = { read: 0, files: files.length, compared: 0, pairs: 0 };
    setStatus({ kind: "running", progress });
    const onProgress = (event: ComparisonProgressEvent) => {
      progress = advance(progress, event);
      setStatus({ kind: "running", progress });
    };
    const name = files.map((file) => file.name).join(NAME_SEPARATOR);
    const request = { name, mode: modeForFiles(files.length), files, onProgress };
    comparisons.startComparison(request).then(showComparison, () => {
      setStatus({ kind: "failed" });
    });
  };
  return { status, start };
}
