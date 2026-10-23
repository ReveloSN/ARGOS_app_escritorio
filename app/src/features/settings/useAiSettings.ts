import { useState } from "react";

import type { AiGateway, AiSettingsResult } from "../../services/engine/aiTypes";
import { useEngineServices } from "../engine/EngineServicesContext";
import { useEngineQuery } from "../engine/useEngineQuery";

function useAiChange(onDone: (result: AiSettingsResult) => void) {
  const [hasFailed, setHasFailed] = useState(false);
  const run = (change: () => Promise<AiSettingsResult>) => {
    setHasFailed(false);
    change().then(onDone, () => {
      setHasFailed(true);
    });
  };
  return { run, hasFailed };
}

function aiActions(ai: AiGateway, run: (change: () => Promise<AiSettingsResult>) => void) {
  return {
    setExplainsChanges: (enabled: boolean) => {
      run(() => ai.setExplainsChanges(enabled));
    },
    storeKey: (key: string) => {
      run(() => ai.storeKey(key));
    },
    removeKey: () => {
      run(() => ai.removeKey());
    },
  };
}

/** Ajustes > Inteligencia artificial: activar la IA y guardar o quitar la clave en el llavero. */
export function useAiSettings(onSaved: () => void) {
  const { ai } = useEngineServices();
  const query = useEngineQuery("ai-settings", () => ai.aiSettings());
  const { run, hasFailed } = useAiChange((result) => {
    query.replace(result);
    onSaved();
  });
  return {
    ...query,
    hasFailed,
    ...aiActions(ai, run),
  };
}

export type AiSettingsControl = ReturnType<typeof useAiSettings>;
