import type { EngineConnection, EngineConnectionSource } from "./engineConnection";
import { readServerSentEvents, type ServerSentEvent } from "./serverSentEvents";

export type FetchResource = (input: string, init: RequestInit) => Promise<Response>;
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface EngineRequest {
  readonly path: string;
  readonly timeoutMs: number;
  readonly method?: HttpMethod;
  /** FormData para archivos; cualquier otro objeto viaja como JSON. */
  readonly body?: FormData | object;
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

/** El motor respondió con un motivo conocido («session_closed», «archived_file_missing»…). */
export class EngineRejectedError extends EngineUnavailableError {
  constructor(
    path: string,
    readonly detail: string,
  ) {
    super(path);
    this.name = "EngineRejectedError";
  }
}

/** Transporte HTTP al motor local: conexión, token, límite de tiempo y errores. */
export class EngineHttp {
  constructor(
    private readonly connectionSource: EngineConnectionSource,
    private readonly fetchResource: FetchResource = (input, init) => fetch(input, init),
  ) {}

  async json<Body>(request: EngineRequest): Promise<Body> {
    const response = await this.respond(request);
    return (await response.json()) as Body;
  }

  async empty(request: EngineRequest): Promise<void> {
    await this.respond(request);
  }

  async stream(request: EngineRequest, onEvent: (event: ServerSentEvent) => void): Promise<void> {
    await readServerSentEvents(await this.respond(request), onEvent);
  }

  private async respond(request: EngineRequest): Promise<Response> {
    const connection = await this.resolveConnection();
    const response = await this.send(connection, request);
    if (!response.ok) throw await rejectionOf(request.path, response);
    return response;
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
        headers: headersFor(connection, request.body),
        signal: AbortSignal.timeout(request.timeoutMs),
        ...bodyOf(request.body),
      });
    } catch (cause) {
      throw new EngineUnavailableError(request.path, { cause });
    }
  }
}

function headersFor(connection: EngineConnection, body: EngineRequest["body"]): HeadersInit {
  const authorization = { Authorization: `Bearer ${connection.token}` };
  return body && !(body instanceof FormData)
    ? { ...authorization, "Content-Type": "application/json" }
    : authorization;
}

function bodyOf(body: EngineRequest["body"]): Pick<RequestInit, "body"> {
  if (!body) return {};
  return { body: body instanceof FormData ? body : JSON.stringify(body) };
}

async function rejectionOf(path: string, response: Response): Promise<EngineUnavailableError> {
  const payload = (await response.json().catch(() => null)) as { detail?: unknown } | null;
  return typeof payload?.detail === "string"
    ? new EngineRejectedError(path, payload.detail)
    : new EngineUnavailableError(path);
}
