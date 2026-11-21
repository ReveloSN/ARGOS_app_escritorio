import { useAiSettings } from "./useAiSettings";
import { useEnginePreferences } from "./useEnginePreferences";
import { useOcrSettings } from "./useOcrSettings";
import { useReloadWhenEngineReady } from "./useReloadWhenEngineReady";

/** Una sola acción recupera todas las secciones que dependen del motor. */
export function useSettingsLoad(onSaved: () => void) {
  const engine = useEnginePreferences(onSaved);
  const ai = useAiSettings(onSaved);
  const ocr = useOcrSettings(onSaved);
  const sections = [engine, ai, ocr];
  const failedSections = () => sections.filter(({ state }) => state.status === "failed");
  const hasLoadFailed = failedSections().length > 0;
  // Solo lo que falló: recargar lo que ya cargó borraría lo que el usuario está escribiendo ahí.
  // Sin cargas fallidas, el error es de guardado: se recargan las preferencias para ver las vigentes.
  const reload = () => {
    const failed = failedSections();
    (failed.length > 0 ? failed : [engine]).forEach((section) => {
      section.reload();
    });
  };
  // Abierto mientras el motor arrancaba: al responder, se recupera solo lo que no cargó.
  useReloadWhenEngineReady(() => {
    failedSections().forEach((section) => {
      section.reload();
    });
  });
  return { engine, ai, ocr, hasLoadFailed, reload };
}
