import type { MeaningResult } from "../../services/engine/comparisonTypes";
import type { Translate } from "../alerts/alertPresentation";

/** «IA: Reformulado» o «IA: Cambio de sentido»: una sugerencia, nunca una decisión. */
export function meaningLabel(meaning: MeaningResult, t: Translate): string {
  return t("comparison.meaning.label", { meaning: t(`comparison.meaning.${meaning.meaning}`) });
}
