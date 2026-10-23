import { useI18n } from "../../i18n/i18nContext";
import { useEngineStatus } from "../engine/useEngineStatus";
import { useReview } from "../review/reviewContext";
import { useAssistantPreferences, useAssistantSignals } from "./assistantContext";
import { assistantStatus, type AssistantSignals, type AssistantStatus } from "./assistantStatus";
import { assistantText, assistantTopbarText } from "./assistantText";

export interface AssistantStatusView {
  readonly status: AssistantStatus;
  /** «Listo», «Leyendo 2 de 5 archivos»…: se muestra aunque el ojo esté oculto. */
  readonly text: string;
  readonly topbarText: string;
  readonly isEyeShown: boolean;
}

/** Las señales reales del momento: motor, lectura, explicación y expediente abierto. */
function useSignals(): AssistantSignals {
  const engine = useEngineStatus();
  const { review, readingProgress } = useReview();
  const signals = useAssistantSignals();
  const unconfirmed = review ? signals.unconfirmedFor(review.session.id) : null;
  return {
    engine,
    reading: readingProgress,
    isExplaining: signals.isExplaining,
    review,
    unconfirmed: unconfirmed ?? 0,
  };
}

/** El estado del asistente, derivado del motor y de la revisión abierta. */
export function useAssistantStatus(): AssistantStatusView {
  const i18n = useI18n();
  const { isAssistantShown } = useAssistantPreferences();
  const status = assistantStatus(useSignals());
  return {
    status,
    text: assistantText(status, i18n),
    topbarText: assistantTopbarText(status, i18n),
    isEyeShown: isAssistantShown,
  };
}
