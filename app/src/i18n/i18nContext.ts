import { createContext, useContext } from "react";

import type { Formatters } from "./formatters";
import type { Locale, Region } from "./messages";
import type { PluralKey, PluralRequest, TranslationKey, TranslationParams } from "./translate";

export interface I18n {
  readonly locale: Locale;
  readonly setLocale: (locale: Locale) => void;
  readonly region: Region;
  readonly setRegion: (region: Region) => void;
  readonly t: (key: TranslationKey, params?: TranslationParams) => string;
  readonly tPlural: (request: PluralRequest) => string;
  /** Valida claves que no se conocen al compilar (las de la explicación que envía el motor). */
  readonly isKey: (key: string) => key is TranslationKey;
  readonly isPluralKey: (key: string) => key is PluralKey;
  readonly format: Formatters;
}

export const I18nContext = createContext<I18n | null>(null);

export function useI18n(): I18n {
  const i18n = useContext(I18nContext);
  if (!i18n) throw new Error("Falta I18nProvider en la raíz de la app.");
  return i18n;
}
