import { useState } from "react";

import type { PreferencesResult, PreferencesUpdate } from "../../services/engine/preferencesTypes";
import { useEngineServices } from "../engine/EngineServicesContext";
import { useEngineQuery, type QueryState } from "../engine/useEngineQuery";

export interface EnginePreferences {
  readonly state: QueryState<PreferencesResult>;
  /** Guarda un cambio sobre los ajustes vigentes; avisa con `onSaved` cuando el motor confirma. */
  readonly save: (change: Partial<PreferencesUpdate>) => void;
  readonly removeRule: (ruleId: number) => void;
  readonly reload: () => void;
  readonly hasSaveFailed: boolean;
}

function updateFrom(current: PreferencesResult, change: Partial<PreferencesUpdate>) {
  const { sensitivity, comparedCategories, hasRetentionLimit } = current;
  return { sensitivity, comparedCategories, hasRetentionLimit, ...change };
}

function useSaveFeedback(onConfirmed: (result: PreferencesResult) => void) {
  const [hasSaveFailed, setHasSaveFailed] = useState(false);
  const confirm = (result: PreferencesResult) => {
    setHasSaveFailed(false);
    onConfirmed(result);
  };
  const fail = () => {
    setHasSaveFailed(true);
  };
  return { confirm, fail, hasSaveFailed };
}

/** Ajustes del motor: Detección (sensibilidad, tipos, casos excluidos) y Privacidad. */
export function useEnginePreferences(onSaved: () => void): EnginePreferences {
  const { preferences } = useEngineServices();
  const query = useEngineQuery("preferences", () => preferences.preferences());
  const { confirm, fail, hasSaveFailed } = useSaveFeedback((result) => {
    query.replace(result);
    onSaved();
  });
  const save = (change: Partial<PreferencesUpdate>) => {
    if (query.state.status !== "ready") return;
    preferences.savePreferences(updateFrom(query.state.data, change)).then(confirm, fail);
  };
  const removeRule = (ruleId: number) => {
    const reloaded = () => preferences.preferences();
    preferences.removeSuppressionRule(ruleId).then(reloaded).then(confirm, fail);
  };
  return { state: query.state, save, removeRule, reload: query.reload, hasSaveFailed };
}
