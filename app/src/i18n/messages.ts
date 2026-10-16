import en from "./en.json";
import es from "./es.json";

export type Messages = typeof es;
export type Locale = "es" | "en";
/** Formato regional de fechas, montos y porcentajes; se elige aparte del idioma en Ajustes. */
export type Region = "es-CO" | "en-US";

export const DEFAULT_LOCALE: Locale = "es";
export const LOCALES: readonly Locale[] = ["es", "en"];
export const REGIONS: readonly Region[] = ["es-CO", "en-US"];

// Formato regional predeterminado de cada idioma.
export const REGION_BY_LOCALE: Readonly<Record<Locale, Region>> = { es: "es-CO", en: "en-US" };

// Tipar en con la forma de es hace que una clave faltante en inglés rompa la compilación.
export const MESSAGES_BY_LOCALE: Readonly<Record<Locale, Messages>> = { es, en };
