import { REGION_BY_LOCALE, type Locale } from "./messages";

export interface Formatters {
  readonly date: (value: Date) => string;
  readonly dateTime: (value: Date) => string;
  readonly amount: (value: number, currency: string) => string;
  readonly percent: (rate: number) => string;
}

const AMOUNT_FRACTION_DIGITS = 2;
const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
};
const TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
};

/** Fechas y montos según el formato regional del idioma (CLAUDE.md §9). */
export function createFormatters(locale: Locale): Formatters {
  const region = REGION_BY_LOCALE[locale];
  const dateFormat = new Intl.DateTimeFormat(region, DATE_OPTIONS);
  const timeFormat = new Intl.DateTimeFormat(region, TIME_OPTIONS);
  const percentFormat = new Intl.NumberFormat(region, { style: "percent" });
  return {
    date: (value) => dateFormat.format(value),
    dateTime: (value) => `${dateFormat.format(value)} ${timeFormat.format(value)}`,
    amount: (value, currency) =>
      new Intl.NumberFormat(region, {
        style: "currency",
        currency,
        currencyDisplay: locale === "es" ? "narrowSymbol" : "code",
        // Intl usa 0 decimales para COP; el formato regional de los mockups muestra 2.
        minimumFractionDigits: AMOUNT_FRACTION_DIGITS,
      }).format(value),
    percent: (rate) => percentFormat.format(rate),
  };
}
