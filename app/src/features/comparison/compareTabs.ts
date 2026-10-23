import type { TranslationKey } from "../../i18n/translate";
import type { CompareTab } from "./useComparisonView";

// Las teclas 1, 2 y 3 del mockup no se traducen: son las que se presionan.
export const COMPARE_TABS: readonly {
  readonly tab: CompareTab;
  readonly label: TranslationKey;
  readonly key: string;
}[] = [
  { tab: "versions", label: "comparison.modes.versions", key: "1" },
  { tab: "inconsistencies", label: "comparison.modes.inconsistencies", key: "2" },
  { tab: "matrix", label: "comparison.modes.matrix", key: "3" },
];
