import { useRef, useState } from "react";

import type { PreferencesResult, PreferencesUpdate } from "../../services/engine/preferencesTypes";
import { useEngineServices } from "../engine/EngineServicesContext";
import { useEngineQuery, type QueryState } from "../engine/useEngineQuery";

export interface EnginePreferences {
  readonly state: QueryState<PreferencesResult>;
  /** Guarda un cambio sobre los ajustes vigentes; avisa con `onSaved` cuando el motor confirma. */
  readonly save: (change: Partial<PreferencesUpdate>) => void;
  readonly removeRule: (ruleId: number) => void;
  readonly reload: () => void;
  /** Vuelve a leer los ajustes sin pasar por «cargando» (p. ej. tras mover el historial). */
  readonly refresh: () => void;
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

/**
 * Cambios aún sin confirmar: cada guardado los incluye todos, así un segundo cambio enviado antes
 * de la respuesta no deshace el primero. Solo cuenta la respuesta del último guardado.
 */
function usePendingChanges() {
  const pending = useRef<Partial<PreferencesUpdate>>({});
  const latest = useRef(0);
  const add = (change: Partial<PreferencesUpdate>) => {
    pending.current = { ...pending.current, ...change };
    const save = ++latest.current;
    return { merged: pending.current, isLatest: () => save === latest.current };
  };
  const settle = () => {
    pending.current = {};
  };
  return { add, settle };
}

interface SaveDeps {
  readonly current: QueryState<PreferencesResult>;
  readonly send: (update: PreferencesUpdate) => Promise<PreferencesResult>;
  readonly confirm: (result: PreferencesResult) => void;
  readonly fail: () => void;
}

/** Guarda un cambio junto con los que aún esperan respuesta; solo cuenta la del último. */
function useSave({ current, send, confirm, fail }: SaveDeps) {
  const changes = usePendingChanges();
  return (change: Partial<PreferencesUpdate>) => {
    if (current.status !== "ready") return;
    const { merged, isLatest } = changes.add(change);
    const settle = () => {
      changes.settle();
      return true;
    };
    send(updateFrom(current.data, merged)).then(
      (result) => {
        if (isLatest() && settle()) confirm(result);
      },
      () => {
        if (isLatest() && settle()) fail();
      },
    );
  };
}

/** Ajustes del motor: Detección (sensibilidad, tipos, casos excluidos) y Privacidad. */
export function useEnginePreferences(onSaved: () => void): EnginePreferences {
  const { preferences } = useEngineServices();
  const query = useEngineQuery("preferences", () => preferences.preferences());
  const { confirm, fail, hasSaveFailed } = useSaveFeedback((result) => {
    query.replace(result);
    onSaved();
  });
  const send = (update: PreferencesUpdate) => preferences.savePreferences(update);
  const save = useSave({ current: query.state, send, confirm, fail });
  const removeRule = (ruleId: number) => {
    const reloaded = () => preferences.preferences();
    preferences.removeSuppressionRule(ruleId).then(reloaded).then(confirm, fail);
  };
  const refresh = () => {
    preferences.preferences().then(query.replace, fail);
  };
  return { state: query.state, save, removeRule, reload: query.reload, refresh, hasSaveFailed };
}
