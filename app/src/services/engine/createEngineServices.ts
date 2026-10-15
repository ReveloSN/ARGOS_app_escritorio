import { isTauri } from "@tauri-apps/api/core";

import type { EngineServices } from "../../features/engine/EngineServicesContext";
import { ConfiguredEngineConnectionSource } from "./configuredEngineConnectionSource";
import { EngineClient } from "./engineClient";
import type { EngineConnectionSource } from "./engineConnection";
import { EngineStatusMonitor } from "./engineStatusMonitor";
import { TauriEngineConnectionSource } from "./tauriEngineConnectionSource";

/** Raíz de composición de la interfaz: elige de dónde sale la conexión al motor. */
export function createEngineServices(): EngineServices {
  const client = new EngineClient(createConnectionSource());
  return { statusMonitor: new EngineStatusMonitor(client) };
}

function createConnectionSource(): EngineConnectionSource {
  if (isTauri()) return new TauriEngineConnectionSource();
  const { VITE_ENGINE_URL: baseUrl, VITE_ENGINE_TOKEN: token } = import.meta.env;
  return new ConfiguredEngineConnectionSource(baseUrl && token ? { baseUrl, token } : null);
}
