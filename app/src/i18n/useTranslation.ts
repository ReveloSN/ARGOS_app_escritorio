import { DEFAULT_LOCALE, MESSAGES_BY_LOCALE } from "./messages";
import { translate, type TranslationKey } from "./translate";

// El idioma configurable (Ajustes > Idioma y región) llega en la Fase 5; mientras tanto
// todos los componentes leen el catálogo por defecto desde este único punto.
export function useTranslation(): (key: TranslationKey) => string {
  const messages = MESSAGES_BY_LOCALE[DEFAULT_LOCALE];
  return (key) => translate(messages, key);
}
