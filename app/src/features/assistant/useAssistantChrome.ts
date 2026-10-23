import type { AssistantSummary } from "../../components/molecules/AssistantStatusCard";
import type { AssistantStatusLine } from "../../components/molecules/AssistantStatusIndicator";
import { useI18n } from "../../i18n/i18nContext";
import { useEngineServices } from "../engine/EngineServicesContext";
import { useAssistantStatus } from "./useAssistantStatus";

export interface AssistantChrome {
  readonly sidebar: AssistantSummary;
  readonly topbar: AssistantStatusLine;
}

/** El mismo estado en la barra lateral (ojo y texto) y en la barra superior (texto corto). */
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
      isHighRisk: isHighRisk || isPaused,
      progress:
        status.condition === "reading" ? { done: status.count, total: status.total } : undefined,
      retry: isPaused ? { label: t("assistant.retry"), onClick: retry } : undefined,
    },
  };
}
