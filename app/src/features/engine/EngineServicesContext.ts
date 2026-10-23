import { createContext, useContext } from "react";

import type { DesktopShell } from "../../services/desktop/desktopShell";
import type { AiGateway } from "../../services/engine/aiTypes";
import type { ComparisonGateway } from "../../services/engine/comparisonTypes";
import type { DocumentAccess } from "../../services/engine/documentTypes";
import type { EngineStatusMonitor } from "../../services/engine/engineStatusMonitor";
import type { FactGateway } from "../../services/engine/factTypes";
import type { HistorySource } from "../../services/engine/historyTypes";
import type { PreferencesStore } from "../../services/engine/preferencesTypes";
import type { ReportGateway } from "../../services/engine/reportTypes";
import type { ReviewGateway } from "../../services/engine/reviewTypes";
import type { SendGateway } from "../../services/engine/sendTypes";

/** Puertos del motor que usa la interfaz; se inyectan desde la raíz (main.tsx o las pruebas). */
export interface EngineServices {
  readonly statusMonitor: EngineStatusMonitor;
  readonly reviews: ReviewGateway;
  readonly comparisons: ComparisonGateway;
  readonly facts: FactGateway;
  readonly sending: SendGateway;
  readonly reports: ReportGateway;
  readonly ai: AiGateway;
  readonly history: HistorySource;
  readonly preferences: PreferencesStore;
  readonly documents: DocumentAccess;
  /** Solo en la app de escritorio; en el navegador es `null` y se ocultan sus acciones. */
  readonly desktop: DesktopShell | null;
}

export const EngineServicesContext = createContext<EngineServices | null>(null);

export function useEngineServices(): EngineServices {
  const services = useContext(EngineServicesContext);
  if (!services) throw new Error("Falta EngineServicesContext.Provider en la raíz de la app.");
  return services;
}
