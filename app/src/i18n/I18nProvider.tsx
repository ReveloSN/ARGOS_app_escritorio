import { useMemo, useState, type ReactNode } from "react";

import { readChoice, type PreferenceStorage } from "../services/preferences/preferenceStorage";
import { createFormatters } from "./formatters";
import { I18nContext, type I18n } from "./i18nContext";
import {
  DEFAULT_LOCALE,
  LOCALES,
  MESSAGES_BY_LOCALE,
  REGION_BY_LOCALE,
  REGIONS,
  type Locale,
  type Region,
} from "./messages";
import { translate, translatePlural } from "./translate";

const LOCALE_KEY = "argus.locale";
const REGION_KEY = "argus.region";

interface I18nProviderProps {
  readonly initialLocale?: Locale;
  /** Dónde se recuerdan el idioma y el formato regional; sin él valen solo en esta ejecución. */
  readonly storage?: PreferenceStorage;
  readonly children: ReactNode;
}

export function I18nProvider({
  initialLocale = DEFAULT_LOCALE,
  storage,
  children,
}: I18nProviderProps) {
  const [locale, setLocale] = useState<Locale>(
    () => readChoice(storage, LOCALE_KEY, LOCALES) ?? initialLocale,
  );
  const [region, setRegion] = useState<Region>(
    () => readChoice(storage, REGION_KEY, REGIONS) ?? REGION_BY_LOCALE[locale],
  );

  const i18n = useMemo<I18n>(() => {
    const messages = MESSAGES_BY_LOCALE[locale];
    return {
      locale,
      setLocale: (next) => {
        storage?.write(LOCALE_KEY, next);
        setLocale(next);
      },
      region,
      setRegion: (next) => {
        storage?.write(REGION_KEY, next);
        setRegion(next);
      },
      t: (key, params) => translate(messages, key, params),
      tPlural: (request) => translatePlural(messages, locale, request),
      format: createFormatters(region, locale),
    };
  }, [locale, region, storage]);

  return <I18nContext.Provider value={i18n}>{children}</I18nContext.Provider>;
}
