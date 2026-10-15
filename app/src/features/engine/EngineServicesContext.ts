import { createContext, useContext } from "react";

import type { EngineStatusMonitor } from "../../services/engine/engineStatusMonitor";
import type { ReviewStarter } from "../../services/engine/reviewTypes";

export interface EngineServices {
  readonly statusMonitor: EngineStatusMonitor;
  readonly reviewStarter: ReviewStarter;
}

export const EngineServicesContext = createContext<EngineServices | null>(null);

export function useEngineServices(): EngineServices {
  const services = useContext(EngineServicesContext);
  if (!services) throw new Error("Falta EngineServicesContext.Provider en la raíz de la app.");
  return services;
}
