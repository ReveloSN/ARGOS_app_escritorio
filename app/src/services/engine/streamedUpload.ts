import { EngineUnavailableError, type EngineHttp } from "./engineHttp";
import type { ServerSentEvent } from "./serverSentEvents";

/** Archivos con sus campos de formulario, tal como los recibe el motor (multipart). */
export interface Upload {
  readonly path: string;
  /** Un campo con varios valores se repite (por ejemplo, los archivos de «Activar OCR»). */
  readonly fields: Readonly<Record<string, string | readonly string[]>>;
  readonly files: readonly File[];
  readonly timeoutMs: number;
}

/**
 * Sube archivos y lee el flujo SSE: cada evento de avance va a `onProgress` y el evento
 * `finishedEvent` trae el resultado. Sin él, el análisis se interrumpió en el motor.
 */
export async function streamUpload<Result>(
  http: EngineHttp,
  upload: Upload & { readonly finishedEvent: string },
  onProgress: (event: ServerSentEvent) => void,
): Promise<Result> {
  let result: Result | undefined;
  const request = { path: upload.path, timeoutMs: upload.timeoutMs, method: "POST" as const };
  await http.stream({ ...request, body: uploadForm(upload) }, (event) => {
    if (event.name === upload.finishedEvent) result = event.data as Result;
    else onProgress(event);
  });
  if (result === undefined) throw new EngineUnavailableError(upload.path);
  return result;
}

function uploadForm({ fields, files }: Upload): FormData {
  const body = new FormData();
  Object.entries(fields).forEach(([name, value]) => {
    const values: readonly string[] = typeof value === "string" ? [value] : value;
    values.forEach((item) => {
      body.append(name, item);
    });
  });
  files.forEach((file) => {
    body.append("files", file, file.name);
  });
  return body;
}

/** Evento de avance con su nombre en `kind`, como lo consume la interfaz. */
export function progressEventOf(event: ServerSentEvent): { readonly kind: string } {
  return { kind: event.name, ...(event.data as object) };
}
