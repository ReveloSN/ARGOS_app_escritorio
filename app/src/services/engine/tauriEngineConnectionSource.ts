import { invoke } from "@tauri-apps/api/core";

import type { EngineConnectionSource, EngineConnectionState } from "./engineConnection";

// Comando definido en src-tauri/src/engine_status.rs.
const ENGINE_STATUS_COMMAND = "engine_status";

type EngineStatusPayload =
  | { readonly kind: "starting" }
  | { readonly kind: "ready"; readonly baseUrl: string; readonly token: string }
  | { readonly kind: "failed" };

export class TauriEngineConnectionSource implements EngineConnectionSource {
  async readConnectionState(): Promise<EngineConnectionState> {
    const payload = await invoke<EngineStatusPayload>(ENGINE_STATUS_COMMAND);
    return toConnectionState(payload);
  }
}

function toConnectionState(payload: EngineStatusPayload): EngineConnectionState {
  if (payload.kind !== "ready") return payload;
  return { kind: "ready", connection: { baseUrl: payload.baseUrl, token: payload.token } };
}
