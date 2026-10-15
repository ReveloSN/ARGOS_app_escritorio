import { ErrorMessage } from "../../components/molecules/ErrorMessage";
import { useI18n } from "../../i18n/i18nContext";
import { useEngineServices } from "./EngineServicesContext";

/** Motor detenido: qué pasó, por qué importa y qué hacer, con un botón para reintentar. */
export function EngineUnavailableMessage() {
  const { t } = useI18n();
  const { statusMonitor } = useEngineServices();

  return (
    <ErrorMessage
      tone="neutral"
      icon="report"
      what={t("engineUnavailable.what")}
      why={t("engineUnavailable.why")}
      todo={t("engineUnavailable.todo")}
      primaryAction={{
        label: t("engineUnavailable.retry"),
        onClick: () => {
          void statusMonitor.refresh();
        },
      }}
    />
  );
}
