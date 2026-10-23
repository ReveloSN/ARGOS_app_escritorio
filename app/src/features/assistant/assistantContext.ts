import { createContext, useContext } from "react";

/** Ajustes › Asistente y los primeros pasos; se recuerdan entre ejecuciones. */
export interface AssistantPreferences {
  readonly isAssistantShown: boolean;
  readonly setAssistantShown: (isShown: boolean) => void;
  /** Reducir movimiento aunque el sistema no lo pida; apagado, vale la preferencia del sistema. */
  readonly isMotionReduced: boolean;
  readonly setMotionReduced: (isReduced: boolean) => void;
  readonly isOnboardingOpen: boolean;
  readonly openOnboarding: () => void;
  readonly closeOnboarding: () => void;
}

/** Lo que otras pantallas le cuentan al asistente: datos reales, nunca simulados. */
export interface AssistantSignalsState {
  readonly isExplaining: boolean;
  readonly setExplaining: (isExplaining: boolean) => void;
  /** Cuántos pares «Sin confirmar» tiene el expediente, o null si no se sabe todavía. */
  readonly unconfirmedFor: (sessionId: string) => number | null;
  readonly reportUnconfirmed: (sessionId: string, count: number) => void;
}

export const AssistantPreferencesContext = createContext<AssistantPreferences | null>(null);
export const AssistantSignalsContext = createContext<AssistantSignalsState | null>(null);

export function useAssistantPreferences(): AssistantPreferences {
  const state = useContext(AssistantPreferencesContext);
  if (!state) throw new Error("Falta AssistantProvider en la raíz de la app.");
  return state;
}

export function useAssistantSignals(): AssistantSignalsState {
  const state = useContext(AssistantSignalsContext);
  if (!state) throw new Error("Falta AssistantProvider en la raíz de la app.");
  return state;
}
