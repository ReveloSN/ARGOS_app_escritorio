import type { ReactNode } from "react";

import { ErrorMessage } from "../../components/molecules/ErrorMessage";
import { useI18n } from "../../i18n/i18nContext";
import type { PreferencesResult } from "../../services/engine/preferencesTypes";
import type { EnginePreferences } from "./useEnginePreferences";

interface EngineSettingsProps {
  readonly engine: EnginePreferences;
  readonly children: (preferences: PreferencesResult) => ReactNode;
}

/**
 * Ajustes que guarda el motor. Si no responde, se explica qué pasa y cómo reintentar; el idioma
 * y el tema siguen funcionando porque viven en la interfaz.
 */
export function EngineSettings({ engine, children }: EngineSettingsProps) {
  const { t } = useI18n();
  if (engine.state.status === "loading") return null;
  if (engine.state.status === "failed") {
    return (
      <ErrorMessage
        tone="neutral"
        what={t("settings.unavailable.what")}
        why={t("settings.unavailable.why")}
        todo={t("settings.unavailable.todo")}
        primaryAction={{ label: t("settings.unavailable.retry"), onClick: engine.reload }}
      />
    );
  }
  return (
    <>
      {engine.hasSaveFailed && (
        <ErrorMessage
          tone="neutral"
          icon="save"
          what={t("settings.saveFailed.what")}
          why={t("settings.saveFailed.why")}
          todo={t("settings.saveFailed.todo")}
          primaryAction={{ label: t("settings.unavailable.retry"), onClick: engine.reload }}
        />
      )}
      {children(engine.state.data)}
    </>
  );
}
