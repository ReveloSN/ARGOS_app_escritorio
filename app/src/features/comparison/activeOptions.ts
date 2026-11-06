import type { TranslationKey } from "../../i18n/translate";
import { COSMETIC_MATERIALITIES, type ChangeFilters } from "./changeFilters";
import { IGNORE_LABELS, TYPE_LABELS } from "./optionLabels";

type Translate = (key: TranslationKey, values?: Record<string, string | number>) => string;

/** Qué filtros están activos, con su nombre: «Ignorando: formato · Mostrando: Faltan». Vacío si ninguno. */
export function describeActiveOptions(filters: ChangeFilters, t: Translate): string {
  const names = COSMETIC_MATERIALITIES.filter((item) => filters.ignored.has(item)).map((item) =>
    t(IGNORE_LABELS[item]),
  );
  return [
    names.length ? t("comparison.options.ignoring", { names: names.join(", ") }) : "",
    filters.type !== "all"
      ? t("comparison.options.showing", { type: t(TYPE_LABELS[filters.type]) })
      : "",
  ]
    .filter(Boolean)
    .join(" · ");
}
