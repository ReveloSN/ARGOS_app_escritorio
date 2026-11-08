import { useState } from "react";

import type { AiGateway, AiProviderValue, AiSettingsResult } from "../../services/engine/aiTypes";
import { useEngineServices } from "../engine/EngineServicesContext";
import { useEngineQuery } from "../engine/useEngineQuery";
import { useLatestChange } from "./useLatestChange";

type AiRun = (kind: string, change: () => Promise<AiSettingsResult>) => void;

function useAiChange(onDone: (result: AiSettingsResult) => void) {
  const [hasFailed, setHasFailed] = useState(false);
  const begin = useLatestChange();
  const run: AiRun = (kind, change) => {
    setHasFailed(false);
    const turn = begin(kind);
    change().then(
      (result) => {
        if (turn.claim()) onDone(result);
      },
      // Se dice, salvo que un cambio más nuevo del mismo ajuste ya se haya guardado.
      () => {
        if (!turn.isFailureStale()) setHasFailed(true);
      },
    );
  };
  return { run, hasFailed };
}

function aiActions(ai: AiGateway, run: AiRun) {
  return {
    setExplainsChanges: (enabled: boolean) => {
      run("explainsChanges", () => ai.setExplainsChanges(enabled));
    },
    setProvider: (provider: AiProviderValue) => {
      run("provider", () => ai.setProvider(provider));
    },
    storeKey: (key: string) => {
      run("key", () => ai.storeKey(key));
    },
    removeKey: () => {
      run("key", () => ai.removeKey());
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
