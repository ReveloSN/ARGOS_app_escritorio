import type { EngineHttp } from "./engineHttp";

const HEALTH_PATH = "/health";
// Un motor colgado debe verse como detenido, no dejar la interfaz esperando para siempre.
const HEALTH_TIMEOUT_MS = 5000;

export interface EngineHealth {
  readonly status: string;
  readonly version: string;
}

/** Estado del motor: lo consulta el monitor que alimenta el indicador de la barra superior. */
export class EngineClient {
  constructor(private readonly http: EngineHttp) {}

  checkHealth(): Promise<EngineHealth> {
    return this.http.json<EngineHealth>({ path: HEALTH_PATH, timeoutMs: HEALTH_TIMEOUT_MS });
  }
}
