import en from "./en.json";
import es from "./es.json";

export type Messages = typeof es;
export type Locale = "es" | "en";

export const DEFAULT_LOCALE: Locale = "es";

// Tipar en con la forma de es hace que una clave faltante en inglés rompa la compilación.
export const MESSAGES_BY_LOCALE: Readonly<Record<Locale, Messages>> = { es, en };
