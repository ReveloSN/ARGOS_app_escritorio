import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { EngineHealth } from "./engineClient";
import { EngineNotReadyError, EngineUnavailableError } from "./engineHttp";
import { EngineStatusMonitor, type EngineHealthChecker } from "./engineStatusMonitor";

const POLL_INTERVAL_MS = 1000;
const HEALTHY: EngineHealth = { status: "ok", version: "1" };

function checkerWith(implementation: () => Promise<EngineHealth>): EngineHealthChecker {
  return { checkHealth: vi.fn(implementation) };
}

async function advancePolls(count: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * count);
}

describe("EngineStatusMonitor", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("empieza en estado de arranque", () => {
    const monitor = new EngineStatusMonitor(checkerWith(() => Promise.resolve(HEALTHY)));

    expect(monitor.currentStatus).toBe("starting");
  });

  it("avisa que el motor está listo cuando responde", async () => {
    const monitor = new EngineStatusMonitor(
      checkerWith(() => Promise.resolve(HEALTHY)),
      POLL_INTERVAL_MS,
    );
    const listener = vi.fn();

    monitor.subscribe(listener);
    await advancePolls(0);

    expect(listener).toHaveBeenCalledWith("ready");
    expect(monitor.currentStatus).toBe("ready");
  });

  it("avisa que el motor se detuvo cuando deja de responder", async () => {
    const checkHealth = vi
      .fn<() => Promise<EngineHealth>>()
      .mockResolvedValueOnce(HEALTHY)
      .mockRejectedValue(new EngineUnavailableError("/health"));
    const monitor = new EngineStatusMonitor({ checkHealth }, POLL_INTERVAL_MS);
    const listener = vi.fn();

    monitor.subscribe(listener);
    await advancePolls(1);

    expect(listener.mock.calls).toEqual([["ready"], ["stopped"]]);
  });

  it("sigue en arranque mientras Tauri prepara el motor", async () => {
    const monitor = new EngineStatusMonitor(
      checkerWith(() => Promise.reject(new EngineNotReadyError(true))),
      POLL_INTERVAL_MS,
    );
    const listener = vi.fn();

    monitor.subscribe(listener);
    await advancePolls(2);

    expect(listener).not.toHaveBeenCalled();
    expect(monitor.currentStatus).toBe("starting");
  });

  it("marca como detenido un motor que no pudo arrancar", async () => {
    const monitor = new EngineStatusMonitor(
      checkerWith(() => Promise.reject(new EngineNotReadyError(false))),
      POLL_INTERVAL_MS,
    );

    monitor.subscribe(vi.fn());
    await advancePolls(0);

    expect(monitor.currentStatus).toBe("stopped");
  });

  it("deja de consultar cuando ya no hay suscriptores", async () => {
    const checkHealth = vi.fn(() => Promise.resolve(HEALTHY));
    const monitor = new EngineStatusMonitor({ checkHealth }, POLL_INTERVAL_MS);

    const unsubscribe = monitor.subscribe(vi.fn());
    await advancePolls(1);
    unsubscribe();
    await advancePolls(3);

    expect(checkHealth).toHaveBeenCalledTimes(2);
  });
});
