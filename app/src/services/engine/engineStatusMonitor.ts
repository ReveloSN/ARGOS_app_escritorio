import type { EngineHealth } from "./engineClient";
import { EngineNotReadyError } from "./engineHttp";

export type EngineStatus = "starting" | "ready" | "stopped";
export type EngineStatusListener = (status: EngineStatus) => void;

export interface EngineHealthChecker {
  checkHealth(): Promise<EngineHealth>;
}

export const DEFAULT_POLL_INTERVAL_MS = 2000;

/** Observer: consulta el motor mientras haya suscriptores y avisa solo cuando cambia el estado. */
export class EngineStatusMonitor {
  private status: EngineStatus = "starting";
  private readonly listeners = new Set<EngineStatusListener>();
  private timer: ReturnType<typeof setInterval> | undefined;

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

  /** Se cumple cuando el motor vuelve a responder, p. ej. después de reiniciarlo. */
  async whenReady(): Promise<void> {
    await this.refresh();
    await new Promise<void>((resolve) => {
      const finish = () => {
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
    this.publish(await this.probe());
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
