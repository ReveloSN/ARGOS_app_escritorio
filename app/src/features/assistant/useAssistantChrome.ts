import type { AssistantSummary } from "../../components/molecules/AssistantStatusCard";
import type { AssistantStatusLine } from "../../components/molecules/AssistantStatusIndicator";
import type { AssistantCondition } from "./assistantStatus";
import { useAssistantStatus } from "./useAssistantStatus";

export interface AssistantChrome {
  readonly sidebar: AssistantSummary;
  readonly topbar: AssistantStatusLine;
  readonly condition: AssistantCondition;
}

/**
 * El estado vive en la barra lateral (ojo y texto). La barra superior solo lo retoma con el
 * avance de la lectura o cuando la lateral está contraída. Con el motor en pausa no lo repite:
 * el aviso de conexión ya lo dice y ofrece «Reintentar conexión».
 */
export function topbarStatusFor(
  chrome: Pick<AssistantChrome, "topbar" | "condition">,
  isSidebarCollapsed: boolean,
): AssistantStatusLine | undefined {
  if (chrome.topbar.progress !== undefined) return chrome.topbar;
  return isSidebarCollapsed && chrome.condition !== "paused" ? chrome.topbar : undefined;
}

export function useAssistantChrome(): AssistantChrome {
  const { status, text, topbarText, isEyeShown } = useAssistantStatus();
  const isHighRisk = status.condition === "highRisk";
  return {
    condition: status.condition,
    sidebar: { eye: status.eye, text, isHighRisk, isEyeShown },
    topbar: {
      text: topbarText,
      // El rojo es solo para riesgo ALTO.
      isHighRisk,
      progress:
        status.condition === "reading" ? { done: status.count, total: status.total } : undefined,
    },
  };
}
