import type {
  EngineConnection,
  EngineConnectionSource,
  EngineConnectionState,
} from "./engineConnection";

/** Conexión fija para desarrollar la interfaz en el navegador, sin Tauri (ver .env.example). */
export class ConfiguredEngineConnectionSource implements EngineConnectionSource {
  constructor(private readonly connection: EngineConnection | null) {}

  readConnectionState(): Promise<EngineConnectionState> {
    const state: EngineConnectionState = this.connection
      ? { kind: "ready", connection: this.connection }
      : { kind: "failed" };
    return Promise.resolve(state);
  }
}
