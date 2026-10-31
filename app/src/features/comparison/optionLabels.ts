import type { TranslationKey } from "../../i18n/translate";
import type { ChangeTypeFilter, CosmeticMateriality } from "./changeFilters";

export const TYPE_LABELS: Readonly<Record<ChangeTypeFilter, TranslationKey>> = {
  all: "comparison.types.all",
  removed: "comparison.types.removed",
  added: "comparison.types.added",
  modified: "comparison.types.modified",
  moved: "comparison.types.moved",
};

export const IGNORE_LABELS: Readonly<Record<CosmeticMateriality, TranslationKey>> = {
  case: "comparison.ignore.case",
  punctuation: "comparison.ignore.punctuation",
  format: "comparison.ignore.format",
};
