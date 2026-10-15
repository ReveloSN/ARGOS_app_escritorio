import { useSyncExternalStore } from "react";

import type { EngineStatus } from "../../services/engine/engineStatusMonitor";
import { useEngineServices } from "./EngineServicesContext";

export function useEngineStatus(): EngineStatus {
  const { statusMonitor } = useEngineServices();
  return useSyncExternalStore(statusMonitor.subscribe, () => statusMonitor.currentStatus);
}
