import type { I18n } from "../../i18n/i18nContext";
import type { ExplanationPartResult } from "../../services/engine/reviewTypes";

type ExplanationContext = Pick<I18n, "t" | "tPlural" | "isKey" | "isPluralKey">;

function sentence(part: ExplanationPartResult, i18n: ExplanationContext): string | undefined {
  if (part.count !== null && i18n.isPluralKey(part.key)) {
    return i18n.tPlural({ key: part.key, count: part.count, params: part.params });
  }
  return i18n.isKey(part.key) ? i18n.t(part.key, part.params) : undefined;
}

/**
 * La explicación que arma el motor (AlertExplainer), en el idioma de la interfaz. Una frase
 * con una clave que esta versión no conoce se omite: el resto de la explicación sigue válido.
 */
export function explanationText(
  parts: readonly ExplanationPartResult[],
  i18n: ExplanationContext,
): string {
  return parts
    .map((part) => sentence(part, i18n))
    .filter((text) => text !== undefined)
    .join(" ");
}
