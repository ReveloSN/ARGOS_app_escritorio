import { isTauri } from "@tauri-apps/api/core";

import type { EngineServices } from "../../features/engine/EngineServicesContext";
import { TauriDesktopShell } from "../desktop/tauriDesktopShell";
import { ComparisonClient } from "./comparisonClient";
import { ConfiguredEngineConnectionSource } from "./configuredEngineConnectionSource";
import { DocumentClient } from "./documentClient";
import { EngineClient } from "./engineClient";
import type { EngineConnectionSource } from "./engineConnection";
import { EngineHttp } from "./engineHttp";
import { EngineStatusMonitor } from "./engineStatusMonitor";
import { FactClient } from "./factClient";
import { HistoryClient } from "./historyClient";
import { PreferencesClient } from "./preferencesClient";
import { ReportClient } from "./reportClient";
import { ReviewClient } from "./reviewClient";
import { SendClient } from "./sendClient";
import { TauriEngineConnectionSource } from "./tauriEngineConnectionSource";

/** Raíz de composición de la interfaz: elige de dónde sale la conexión al motor. */
export function createEngineServices(): EngineServices {
  const http = new EngineHttp(createConnectionSource());
  return {
    statusMonitor: new EngineStatusMonitor(new EngineClient(http)),
    reviews: new ReviewClient(http),
    comparisons: new ComparisonClient(http),
    facts: new FactClient(http),
    sending: new SendClient(http),
    reports: new ReportClient(http),
    history: new HistoryClient(http),
    preferences: new PreferencesClient(http),
    documents: new DocumentClient(http),
    desktop: isTauri() ? new TauriDesktopShell() : null,
  };
}

function createConnectionSource(): EngineConnectionSource {
  if (isTauri()) return new TauriEngineConnectionSource();
  const { VITE_ENGINE_URL: baseUrl, VITE_ENGINE_TOKEN: token } = import.meta.env;
  return new ConfiguredEngineConnectionSource(baseUrl && token ? { baseUrl, token } : null);
}
