import { invoke } from "@tauri-apps/api/core";
import { describe, expect, it, vi } from "vitest";

import { TauriEngineConnectionSource } from "./tauriEngineConnectionSource";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

const invokeMock = vi.mocked(invoke);

describe("TauriEngineConnectionSource", () => {
  it("convierte el estado listo de Tauri en una conexión", async () => {
    invokeMock.mockResolvedValueOnce({
      kind: "ready",
      baseUrl: "http://127.0.0.1:5000",
      token: "secret",
    });

    const state = await new TauriEngineConnectionSource().readConnectionState();

    expect(invokeMock).toHaveBeenCalledWith("engine_status");
    expect(state).toEqual({
      kind: "ready",
      connection: { baseUrl: "http://127.0.0.1:5000", token: "secret" },
    });
  });

  it.each(["starting", "failed"] as const)("conserva el estado %s", async (kind) => {
    invokeMock.mockResolvedValueOnce({ kind });

    const state = await new TauriEngineConnectionSource().readConnectionState();

    expect(state).toEqual({ kind });
  });
});
