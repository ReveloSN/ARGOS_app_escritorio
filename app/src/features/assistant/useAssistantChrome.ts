import type { AssistantSummary } from "../../components/molecules/AssistantStatusCard";
import type { AssistantStatusLine } from "../../components/molecules/AssistantStatusIndicator";
import { useI18n } from "../../i18n/i18nContext";
import { useEngineServices } from "../engine/EngineServicesContext";
import { useAssistantStatus } from "./useAssistantStatus";

export interface AssistantChrome {
  readonly sidebar: AssistantSummary;
  readonly topbar: AssistantStatusLine;
}

/**
 * El estado vive en la barra lateral (ojo y texto). La barra superior solo lo retoma cuando la
 * lateral está contraída o cuando hay algo que atender: el avance de la lectura o «Reintentar».
 */
export function topbarStatusFor(
  topbar: AssistantStatusLine,
  isSidebarCollapsed: boolean,
): AssistantStatusLine | undefined {
  const needsAttention = topbar.progress !== undefined || topbar.retry !== undefined;
  return isSidebarCollapsed || needsAttention ? topbar : undefined;
}

export function useAssistantChrome(): AssistantChrome {
  const { t } = useI18n();
  const { statusMonitor } = useEngineServices();
  const { status, text, topbarText, isEyeShown } = useAssistantStatus();
  const isHighRisk = status.condition === "highRisk";
  const isPaused = status.condition === "paused";
  const retry = () => {
    void statusMonitor.refresh();
  };
  return {
    sidebar: { eye: status.eye, text, isHighRisk, isEyeShown },
    topbar: {
      text: topbarText,
      // El rojo es solo para riesgo ALTO; la pausa ya tiene su texto y «Reintentar».
      isHighRisk,
      progress:
        status.condition === "reading" ? { done: status.count, total: status.total } : undefined,
      retry: isPaused ? { label: t("assistant.retry"), onClick: retry } : undefined,
    },
  };
}
