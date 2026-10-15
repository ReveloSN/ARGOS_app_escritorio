import type { TranslationKey } from "../../i18n/translate";
import { useTranslation } from "../../i18n/useTranslation";
import type { EngineStatus } from "../../services/engine/engineStatusMonitor";

const STATUS_MESSAGE_KEYS: Readonly<Record<EngineStatus, TranslationKey>> = {
  starting: "engine.status.starting",
  ready: "engine.status.ready",
  stopped: "engine.status.stopped",
};

interface EngineStatusIndicatorProps {
  readonly status: EngineStatus;
}

// Sin estilos hasta la Fase 5: el estado ya se comunica con texto, no solo con color.
export function EngineStatusIndicator({ status }: EngineStatusIndicatorProps) {
  const t = useTranslation();
  return <p role="status">{t(STATUS_MESSAGE_KEYS[status])}</p>;
}
