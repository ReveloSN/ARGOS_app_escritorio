import type { ReactNode } from "react";

import type { PreferenceStorage } from "../../services/preferences/preferenceStorage";
import { AssistantPreferencesContext, AssistantSignalsContext } from "./assistantContext";
import { useAssistantPreferencesState } from "./useAssistantPreferencesState";
import { useAssistantSignalsState } from "./useAssistantSignalsState";

interface AssistantProviderProps {
  /** Dónde se recuerdan «Mostrar asistente», «Reducir movimiento» y los primeros pasos. */
  readonly storage?: PreferenceStorage | undefined;
  readonly children: ReactNode;
}

/** El asistente de IA: sus ajustes y las señales reales de las que sale su estado. */
export function AssistantProvider({ storage, children }: AssistantProviderProps) {
  const preferences = useAssistantPreferencesState(storage);
  const signals = useAssistantSignalsState();
  return (
    <AssistantPreferencesContext.Provider value={preferences}>
      <AssistantSignalsContext.Provider value={signals}>
        {children}
      </AssistantSignalsContext.Provider>
    </AssistantPreferencesContext.Provider>
  );
}
