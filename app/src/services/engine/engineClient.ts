import type { EngineConnection, EngineConnectionSource } from "./engineConnection";
import type { ReviewRequest, ReviewResult, ReviewStarter } from "./reviewTypes";

const HEALTH_PATH = "/health";
const REVIEWS_PATH = "/reviews";
// Un motor colgado debe verse como detenido, no dejar la interfaz esperando para siempre.
const HEALTH_TIMEOUT_MS = 5000;
// Leer y comparar varios archivos tarda más; el límite coincide con el del motor (120 s).
const REVIEW_TIMEOUT_MS = 120_000;

type FetchResource = (input: string, init: RequestInit) => Promise<Response>;

interface EngineRequest {
  readonly path: string;
  readonly timeoutMs: number;
  readonly method?: "GET" | "POST";
  readonly body?: FormData;
}

export interface EngineHealth {
  readonly status: string;
  readonly version: string;
}

export class EngineNotReadyError extends Error {
  constructor(readonly isStarting: boolean) {
    super(isStarting ? "El motor todavía está arrancando." : "El motor no pudo arrancar.");
    this.name = "EngineNotReadyError";
  }
}

export class EngineUnavailableError extends Error {
  constructor(path: string, options?: ErrorOptions) {
    super(`El motor no respondió a ${path}.`, options);
    this.name = "EngineUnavailableError";
  }
}

/** Único punto de acceso HTTP de la interfaz al motor local (CLAUDE.md §3). */
export class EngineClient implements ReviewStarter {
  constructor(
    private readonly connectionSource: EngineConnectionSource,
    private readonly fetchResource: FetchResource = (input, init) => fetch(input, init),
  ) {}

  checkHealth(): Promise<EngineHealth> {
    return this.requestJson<EngineHealth>({ path: HEALTH_PATH, timeoutMs: HEALTH_TIMEOUT_MS });
  }

  startReview({ name, files }: ReviewRequest): Promise<ReviewResult> {
    const body = new FormData();
    body.append("name", name);
    files.forEach((file) => {
      body.append("files", file, file.name);
    });
    return this.requestJson<ReviewResult>({
      path: REVIEWS_PATH,
      timeoutMs: REVIEW_TIMEOUT_MS,
      method: "POST",
      body,
    });
  }

  private async requestJson<Body>(request: EngineRequest): Promise<Body> {
    const connection = await this.resolveConnection();
    const response = await this.send(connection, request);
    if (!response.ok) throw new EngineUnavailableError(request.path);
    return (await response.json()) as Body;
  }

  private async resolveConnection(): Promise<EngineConnection> {
    const state = await this.connectionSource.readConnectionState();
    if (state.kind !== "ready") throw new EngineNotReadyError(state.kind === "starting");
    return state.connection;
  }

  private async send(connection: EngineConnection, request: EngineRequest): Promise<Response> {
    try {
      return await this.fetchResource(`${connection.baseUrl}${request.path}`, {
        method: request.method ?? "GET",
        headers: { Authorization: `Bearer ${connection.token}` },
        signal: AbortSignal.timeout(request.timeoutMs),
        ...(request.body ? { body: request.body } : {}),
      });
    } catch (cause) {
      throw new EngineUnavailableError(request.path, { cause });
    }
  }
}
