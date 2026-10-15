import { createContext, useContext } from "react";

import type { Formatters } from "./formatters";
import type { Locale } from "./messages";
import type { PluralRequest, TranslationKey, TranslationParams } from "./translate";

export interface I18n {
  readonly locale: Locale;
  readonly setLocale: (locale: Locale) => void;
  readonly t: (key: TranslationKey, params?: TranslationParams) => string;
  readonly tPlural: (request: PluralRequest) => string;
  readonly format: Formatters;
}

export const I18nContext = createContext<I18n | null>(null);

export function useI18n(): I18n {
  const i18n = useContext(I18nContext);
  if (!i18n) throw new Error("Falta I18nProvider en la raíz de la app.");
  return i18n;
}
