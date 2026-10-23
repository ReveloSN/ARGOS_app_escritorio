import type { I18n } from "../../i18n/i18nContext";
import type {
  AlertResult,
  AlertSideResult,
  CorrectSideValue,
} from "../../services/engine/reviewTypes";
import { describeLocation } from "./alertPresentation";

type HintContext = Pick<I18n, "t" | "tPlural">;

/** Dónde está el valor que hay que corregir: el archivo y la ubicación, o cuántos son. */
function whereToCorrect(side: AlertSideResult, i18n: HintContext): string {
  const [only] = side.occurrences;
  if (side.occurrences.length === 1 && only) {
    return `${only.document}, ${describeLocation(only.location, i18n.t)}`;
  }
  const files = new Set(side.occurrences.map((occurrence) => occurrence.document)).size;
  return i18n.tPlural({
    key: "decisionPanel.inFiles",
    count: files,
    params: { occurrences: side.occurrences.length },
  });
}

/**
 * «Se agregará a correcciones: cambiar 4587 por 4857 en Anexo_1_condiciones.pdf, Página 2.»
 * Sin valor elegido, explica que elegirlo es opcional.
 */
export function correctionHint(
  alert: AlertResult,
  correctSide: CorrectSideValue | undefined,
  i18n: HintContext,
): string {
  if (!correctSide || !alert.second) return i18n.t("decisionPanel.optionalHint");
  const [right, wrong] =
    correctSide === "first" ? [alert.first, alert.second] : [alert.second, alert.first];
  return i18n.t("decisionPanel.correction", {
    wrong: wrong.value,
    right: right.value,
    where: whereToCorrect(wrong, i18n),
  });
}
