import type { ReviewProgressEvent } from "../../services/engine/reviewTypes";

export type FileReadStatus = "waiting" | "reading" | "read" | "unreadable";

export interface FileProgress {
  readonly name: string;
  readonly status: FileReadStatus;
  /** Con OCR: página que se terminó de leer y total del archivo. */
  readonly pages?: { readonly done: number; readonly total: number };
}

/** Cómo va la lectura de una revisión nueva, según los eventos del motor (SSE). */
export interface ReadingState {
  readonly files: readonly FileProgress[];
  readonly isComparing: boolean;
  readonly startedAt: number;
  /** Segundos que faltan según el ritmo de los archivos ya leídos; undefined si aún no se sabe. */
  readonly remainingSeconds: number | undefined;
}

const MS_PER_SECOND = 1000;

export function startReading(names: readonly string[], now: number): ReadingState {
  return {
    files: names.map((name) => ({ name, status: "waiting" })),
    isComparing: false,
    startedAt: now,
    remainingSeconds: undefined,
  };
}

export function finishedCount(state: ReadingState): number {
  return state.files.filter((file) => file.status === "read" || file.status === "unreadable")
    .length;
}

function withStatus(state: ReadingState, position: number, status: FileReadStatus): ReadingState {
  const files = state.files.map((file, index) => (index === position ? { ...file, status } : file));
  return { ...state, files };
}

function withPages(
  state: ReadingState,
  { position, done, total }: { position: number; done: number; total: number },
): ReadingState {
  const files = state.files.map((file, index) =>
    index === position ? { ...file, pages: { done, total } } : file,
  );
  return { ...state, files };
}

function estimateRemaining(state: ReadingState, now: number): number | undefined {
  const done = finishedCount(state);
  if (done === 0) return undefined;
  const secondsPerFile = (now - state.startedAt) / MS_PER_SECOND / done;
  return secondsPerFile * (state.files.length - done);
}

export function applyProgress(
  state: ReadingState,
  event: ReviewProgressEvent,
  now: number,
): ReadingState {
  if (event.kind === "analysis_started")
    return { ...state, isComparing: true, remainingSeconds: undefined };
  if (event.kind === "document_started") return withStatus(state, event.position, "reading");
  if (event.kind === "page_recognized") return withPages(state, event);
  const status = event.document.status === "read" ? "read" : "unreadable";
  const updated = withStatus(state, event.position, status);
  return { ...updated, remainingSeconds: estimateRemaining(updated, now) };
}
