import type { EngineConnection, EngineConnectionSource } from "./engineConnection";

const HEALTH_PATH = "/health";
// Un motor colgado debe verse como detenido, no dejar la interfaz esperando para siempre.
const REQUEST_TIMEOUT_MS = 5000;

type FetchResource = (input: string, init: RequestInit) => Promise<Response>;

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
export class EngineClient {
  constructor(
    private readonly connectionSource: EngineConnectionSource,
    private readonly fetchResource: FetchResource = (input, init) => fetch(input, init),
  ) {}

  checkHealth(): Promise<EngineHealth> {
    return this.getJson<EngineHealth>(HEALTH_PATH);
  }

  private async getJson<Body>(path: string): Promise<Body> {
    const connection = await this.resolveConnection();
    const response = await this.send(connection, path);
    if (!response.ok) throw new EngineUnavailableError(path);
    return (await response.json()) as Body;
  }

  private async resolveConnection(): Promise<EngineConnection> {
    const state = await this.connectionSource.readConnectionState();
    if (state.kind !== "ready") throw new EngineNotReadyError(state.kind === "starting");
    return state.connection;
  }

  private async send(connection: EngineConnection, path: string): Promise<Response> {
    try {
      return await this.fetchResource(`${connection.baseUrl}${path}`, {
        headers: { Authorization: `Bearer ${connection.token}` },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (cause) {
      throw new EngineUnavailableError(path, { cause });
    }
  }
}
