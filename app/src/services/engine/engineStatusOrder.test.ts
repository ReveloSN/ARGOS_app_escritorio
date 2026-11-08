import { describe, expect, it, vi } from "vitest";

import type { EngineHealth } from "./engineClient";
import { EngineUnavailableError } from "./engineHttp";
import { EngineStatusMonitor, WHEN_READY_TIMEOUT_MS } from "./engineStatusMonitor";

const HEALTHY: EngineHealth = { status: "ok", version: "1" };

/** Cada consulta de salud queda pendiente hasta que la prueba decide cómo y cuándo responde. */
function deferredChecks() {
  const pending: { resolve: () => void; reject: () => void }[] = [];
  const checkHealth = () =>
    new Promise<EngineHealth>((resolve, reject) => {
      pending.push({
        resolve: () => {
          resolve(HEALTHY);
        },
        reject: () => {
          reject(new EngineUnavailableError("/health"));
        },
      });
    });
  return { checker: { checkHealth }, pending };
}

describe("estado del motor con consultas solapadas", () => {
  it("(regresión) una consulta vieja que falla tarde no tapa la nueva que ya respondió", async () => {
    const { checker, pending } = deferredChecks();
    const monitor = new EngineStatusMonitor(checker);

    const slow = monitor.refresh();
    const fast = monitor.refresh();
    pending[1]?.resolve();
    await fast;
    pending[0]?.reject();
    await slow;

    expect(monitor.currentStatus).toBe("ready");
  });
});

describe("esperar a que el motor vuelva", () => {
  it("(regresión) si no vuelve, deja de esperar al cumplirse el plazo y deja de consultar", async () => {
    vi.useFakeTimers();
    const checkHealth = vi.fn(() => Promise.reject(new EngineUnavailableError("/health")));
    const monitor = new EngineStatusMonitor({ checkHealth });

    const waiting = monitor.whenReady();
    const outcome = expect(waiting).rejects.toBeInstanceOf(EngineUnavailableError);
    await vi.advanceTimersByTimeAsync(WHEN_READY_TIMEOUT_MS);
    await outcome;
    const callsAtTimeout = checkHealth.mock.calls.length;
    await vi.advanceTimersByTimeAsync(WHEN_READY_TIMEOUT_MS);

    expect(checkHealth.mock.calls.length).toBe(callsAtTimeout);
    vi.useRealTimers();
  });
});
