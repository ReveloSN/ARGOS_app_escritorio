import { useAiSettings } from "./useAiSettings";
import { useEnginePreferences } from "./useEnginePreferences";
import { useOcrSettings } from "./useOcrSettings";

/** Una sola acción recupera todas las secciones que dependen del motor. */
export function useSettingsLoad(onSaved: () => void) {
  const engine = useEnginePreferences(onSaved);
  const ai = useAiSettings(onSaved);
  const ocr = useOcrSettings(onSaved);
  const hasLoadFailed = [engine, ai, ocr].some(({ state }) => state.status === "failed");
  // Solo lo que falló: recargar lo que ya cargó borraría lo que el usuario está escribiendo ahí.
  // Sin cargas fallidas, el error es de guardado: se recargan las preferencias para ver las vigentes.
  const reload = () => {
    const failed = [engine, ai, ocr].filter(({ state }) => state.status === "failed");
    (failed.length > 0 ? failed : [engine]).forEach((section) => {
      section.reload();
    });
  };
  return { engine, ai, ocr, hasLoadFailed, reload };
}
