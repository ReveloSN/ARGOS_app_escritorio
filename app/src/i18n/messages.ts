import en from "./en.json";
import es from "./es.json";

export type Messages = typeof es;
export type Locale = "es" | "en";

export const DEFAULT_LOCALE: Locale = "es";

// Formato regional de cada idioma (fechas, montos, porcentajes).
export const REGION_BY_LOCALE: Readonly<Record<Locale, string>> = { es: "es-CO", en: "en-US" };

// Tipar en con la forma de es hace que una clave faltante en inglés rompa la compilación.
export const MESSAGES_BY_LOCALE: Readonly<Record<Locale, Messages>> = { es, en };
