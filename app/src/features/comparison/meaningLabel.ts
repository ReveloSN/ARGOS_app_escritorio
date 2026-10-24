import type { MeaningResult } from "../../services/engine/comparisonTypes";
import type { Translate } from "../alerts/alertPresentation";

/** «Reformulado, mismo significado» o «Posible cambio de significado»: una sugerencia, nunca una decisión. */
export function meaningLabel(meaning: MeaningResult, t: Translate): string {
  return t(`comparison.meaning.${meaning.meaning}`);
}
