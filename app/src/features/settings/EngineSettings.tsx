import type { ReactNode } from "react";

import type { PreferencesResult } from "../../services/engine/preferencesTypes";
import { SettingsLoadState } from "./SettingsLoadState";
import type { EnginePreferences } from "./useEnginePreferences";

interface EngineSettingsProps {
  readonly engine: EnginePreferences;
  readonly children: (preferences: PreferencesResult) => ReactNode;
}

/** Los ajustes locales siguen disponibles mientras se cargan los que guarda el motor. */
export function EngineSettings({ engine, children }: EngineSettingsProps) {
  if (engine.state.status !== "ready") {
    return <SettingsLoadState isFailed={engine.state.status === "failed"} />;
  }
  return <>{children(engine.state.data)}</>;
}
