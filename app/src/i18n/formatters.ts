import { REGION_BY_LOCALE, type Locale, type Region } from "./messages";

export interface Formatters {
  readonly date: (value: Date) => string;
  readonly dateTime: (value: Date) => string;
  readonly time: (value: Date) => string;
  readonly amount: (value: number, currency: string) => string;
  readonly percent: (rate: number) => string;
  /** «2 y 3», «2, 3 and 5»: enumeraciones con la conjunción del idioma. */
  readonly list: (items: readonly string[]) => string;
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

// En Colombia el monto se escribe con el símbolo («$ 18.450.000,00»); en inglés, con el código.
const NARROW_SYMBOL_REGIONS: ReadonlySet<Region> = new Set(["es-CO"]);

/**
 * Fechas y montos según el formato regional elegido (CLAUDE.md §9); las enumeraciones, en el
 * idioma de la interfaz («2 y 3» o «2 and 3»).
 */
export function createFormatters(region: Region, language: Locale): Formatters {
  const dateFormat = new Intl.DateTimeFormat(region, DATE_OPTIONS);
  const timeFormat = new Intl.DateTimeFormat(region, TIME_OPTIONS);
  const percentFormat = new Intl.NumberFormat(region, { style: "percent" });
  const listFormat = new Intl.ListFormat(REGION_BY_LOCALE[language], { type: "conjunction" });
  return {
    date: (value) => dateFormat.format(value),
    dateTime: (value) => `${dateFormat.format(value)} ${timeFormat.format(value)}`,
    time: (value) => timeFormat.format(value),
    amount: (value, currency) =>
      new Intl.NumberFormat(region, {
        style: "currency",
        currency,
        currencyDisplay: NARROW_SYMBOL_REGIONS.has(region) ? "narrowSymbol" : "code",
        // Intl usa 0 decimales para COP; el formato regional de los mockups muestra 2.
        minimumFractionDigits: AMOUNT_FRACTION_DIGITS,
      }).format(value),
    percent: (rate) => percentFormat.format(rate),
    list: (items) => listFormat.format(items),
  };
}
