import { useMemo, useState, type ReactNode } from "react";

import { createFormatters } from "./formatters";
import { I18nContext, type I18n } from "./i18nContext";
import { DEFAULT_LOCALE, MESSAGES_BY_LOCALE, type Locale } from "./messages";
import { translate, translatePlural } from "./translate";

interface I18nProviderProps {
  readonly initialLocale?: Locale;
  readonly children: ReactNode;
}

export function I18nProvider({ initialLocale = DEFAULT_LOCALE, children }: I18nProviderProps) {
  const [locale, setLocale] = useState<Locale>(initialLocale);

  const i18n = useMemo<I18n>(() => {
    const messages = MESSAGES_BY_LOCALE[locale];
    return {
      locale,
      setLocale,
      t: (key, params) => translate(messages, key, params),
      tPlural: (request) => translatePlural(messages, locale, request),
      format: createFormatters(locale),
    };
  }, [locale]);

  return <I18nContext.Provider value={i18n}>{children}</I18nContext.Provider>;
}
