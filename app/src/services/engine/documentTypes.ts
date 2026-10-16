/** Búsqueda en documentos y apertura del archivo (engine/argus/api/schemas/documents.py). */

import type { SourceLocationResult } from "./reviewTypes";

export interface DocumentMatchResult {
  readonly document: string;
  readonly location: SourceLocationResult;
  readonly excerpt: string;
  readonly highlightStart: number;
  readonly highlightEnd: number;
}

export interface DocumentAccess {
  searchDocuments(sessionId: string, query: string): Promise<readonly DocumentMatchResult[]>;
  openDocument(sessionId: string, document: string): Promise<void>;
}
