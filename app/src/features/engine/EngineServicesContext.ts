import { createContext, useContext } from "react";

import type { DocumentAccess } from "../../services/engine/documentTypes";
import type { EngineStatusMonitor } from "../../services/engine/engineStatusMonitor";
import type { HistorySource } from "../../services/engine/historyTypes";
import type { PreferencesStore } from "../../services/engine/preferencesTypes";
import type { ReviewGateway } from "../../services/engine/reviewTypes";

/** Puertos del motor que usa la interfaz; se inyectan desde la raíz (main.tsx o las pruebas). */
export interface EngineServices {
  readonly statusMonitor: EngineStatusMonitor;
  readonly reviews: ReviewGateway;
  readonly history: HistorySource;
  readonly preferences: PreferencesStore;
  readonly documents: DocumentAccess;
}

export const EngineServicesContext = createContext<EngineServices | null>(null);

export function useEngineServices(): EngineServices {
  const services = useContext(EngineServicesContext);
  if (!services) throw new Error("Falta EngineServicesContext.Provider en la raíz de la app.");
  return services;
}
