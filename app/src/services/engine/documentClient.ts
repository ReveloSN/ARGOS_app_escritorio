import type { DocumentAccess, DocumentMatchResult } from "./documentTypes";
import type { EngineHttp } from "./engineHttp";

const REQUEST_TIMEOUT_MS = 10_000;
// Abrir un archivo lanza otra aplicación del sistema; puede tardar un poco más.
const OPEN_TIMEOUT_MS = 20_000;

/** Texto de los documentos de una revisión y su archivo original. */
export class DocumentClient implements DocumentAccess {
  constructor(private readonly http: EngineHttp) {}

  searchDocuments(sessionId: string, query: string): Promise<readonly DocumentMatchResult[]> {
    const search = new URLSearchParams({ q: query });
    const path = `/reviews/${encodeURIComponent(sessionId)}/search?${search.toString()}`;
    return this.http.json({ path, timeoutMs: REQUEST_TIMEOUT_MS });
  }

  openDocument(sessionId: string, document: string): Promise<void> {
    const path = `/reviews/${encodeURIComponent(sessionId)}/documents/open`;
    return this.http.empty({
      path,
      timeoutMs: OPEN_TIMEOUT_MS,
      method: "POST",
      body: { document },
    });
  }
}
