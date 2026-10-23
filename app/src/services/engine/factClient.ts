import type { EngineHttp } from "./engineHttp";
import type { FactGateway, FactInput, FactsResult } from "./factTypes";

const REQUEST_TIMEOUT_MS = 10_000;

function factsPath(sessionId: string, suffix = ""): string {
  return `/reviews/${encodeURIComponent(sessionId)}/facts${suffix}`;
}

/** Datos confirmados en el motor: cada respuesta trae los datos ya comparados con los documentos. */
export class FactClient implements FactGateway {
  constructor(private readonly http: EngineHttp) {}

  listFacts(sessionId: string): Promise<FactsResult> {
    return this.http.json({ path: factsPath(sessionId), timeoutMs: REQUEST_TIMEOUT_MS });
  }

  addFact(sessionId: string, fact: FactInput): Promise<FactsResult> {
    return this.send(factsPath(sessionId), "POST", fact);
  }

  editFact(sessionId: string, factId: number, value: string): Promise<FactsResult> {
    return this.send(factsPath(sessionId, `/${String(factId)}`), "PUT", { value });
  }

  retireFact(sessionId: string, factId: number): Promise<FactsResult> {
    return this.send(factsPath(sessionId, `/${String(factId)}/retire`), "POST");
  }

  restoreFact(sessionId: string, factId: number): Promise<FactsResult> {
    return this.send(factsPath(sessionId, `/${String(factId)}/restore`), "POST");
  }

  undoFact(sessionId: string): Promise<FactsResult> {
    return this.send(factsPath(sessionId, "/undo"), "POST");
  }

  private send(path: string, method: "POST" | "PUT", body?: object): Promise<FactsResult> {
    return this.http.json({ path, timeoutMs: REQUEST_TIMEOUT_MS, method, ...(body && { body }) });
  }
}
