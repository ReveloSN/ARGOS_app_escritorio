import type { EngineHealth } from "./engineClient";
import { EngineNotReadyError, EngineUnavailableError } from "./engineHttp";

export type EngineStatus = "starting" | "ready" | "stopped";
export type EngineStatusListener = (status: EngineStatus) => void;

export interface EngineHealthChecker {
  checkHealth(): Promise<EngineHealth>;
}

export const DEFAULT_POLL_INTERVAL_MS = 2000;
/** Cuánto se espera a que el motor vuelva tras reiniciarlo (carga los modelos al arrancar). */
export const WHEN_READY_TIMEOUT_MS = 120_000;
const HEALTH_PATH = "/health";

/** Observer: consulta el motor mientras haya suscriptores y avisa solo cuando cambia el estado. */
export class EngineStatusMonitor {
  private status: EngineStatus = "starting";
  private readonly listeners = new Set<EngineStatusListener>();
  private timer: ReturnType<typeof setInterval> | undefined;
  // Las consultas se solapan (intervalo, «Reintentar», whenReady): solo publica una más reciente
  // que la última publicada, para que un fallo viejo no tape una respuesta nueva.
  private lastProbe = 0;
  private lastPublishedProbe = 0;

  constructor(
    private readonly healthChecker: EngineHealthChecker,
    private readonly pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  ) {}

  get currentStatus(): EngineStatus {
    return this.status;
  }

  // Función flecha: React la recibe suelta en useSyncExternalStore.
  readonly subscribe = (listener: EngineStatusListener): (() => void) => {
    this.listeners.add(listener);
    if (this.listeners.size === 1) this.startPolling();
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) this.stopPolling();
    };
  };

  private startPolling(): void {
    void this.refresh();
    this.timer = setInterval(() => void this.refresh(), this.pollIntervalMs);
  }

  private stopPolling(): void {
    clearInterval(this.timer);
    this.timer = undefined;
  }

  /**
   * Se cumple cuando el motor vuelve a responder, p. ej. después de reiniciarlo. Si no vuelve en
   * el plazo, se rechaza y deja de consultar: quien espera puede decir que no respondió.
   */
  async whenReady(timeoutMs = WHEN_READY_TIMEOUT_MS): Promise<void> {
    await this.refresh();
    await new Promise<void>((resolve, reject) => {
      const deadline = setTimeout(() => {
        unsubscribe();
        reject(new EngineUnavailableError(HEALTH_PATH));
      }, timeoutMs);
      const finish = () => {
        clearTimeout(deadline);
        unsubscribe();
        resolve();
      };
      const unsubscribe = this.subscribe((status) => {
        if (status === "ready") finish();
      });
      // Ya respondía (o respondió entre la consulta y la suscripción).
      if (this.status === "ready") finish();
    });
  }

  /** Consulta el motor ahora mismo, sin esperar al siguiente intervalo («Reintentar»). */
  async refresh(): Promise<void> {
    const probe = ++this.lastProbe;
    const status = await this.probe();
    if (probe < this.lastPublishedProbe) return;
    this.lastPublishedProbe = probe;
    this.publish(status);
  }

  private async probe(): Promise<EngineStatus> {
    try {
      await this.healthChecker.checkHealth();
      return "ready";
    } catch (error) {
      return error instanceof EngineNotReadyError && error.isStarting ? "starting" : "stopped";
    }
  }

  private publish(status: EngineStatus): void {
    if (status === this.status) return;
    this.status = status;
    this.listeners.forEach((listener) => {
      listener(status);
    });
  }
}
