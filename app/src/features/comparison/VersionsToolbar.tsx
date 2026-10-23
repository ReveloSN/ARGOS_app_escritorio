import { Checkbox } from "../../components/atoms/Checkbox";
import { Icon } from "../../components/atoms/Icon";
import { joinClassNames } from "../../components/joinClassNames";
import { useI18n } from "../../i18n/i18nContext";
import type { PluralKey, TranslationKey } from "../../i18n/translate";
import type { ChangeKindValue, PairComparisonResult } from "../../services/engine/comparisonTypes";
import {
  CHANGE_KINDS,
  COSMETIC_MATERIALITIES,
  countByKind,
  shownChanges,
  type ChangeFilters,
  type CosmeticMateriality,
} from "./changeFilters";
import styles from "./Compare.module.css";

const COUNTER_LABELS: Readonly<Record<ChangeKindValue, PluralKey>> = {
  removed: "comparison.counters.removed",
  added: "comparison.counters.added",
  modified: "comparison.counters.modified",
  moved: "comparison.counters.moved",
};
const IGNORE_LABELS: Readonly<Record<CosmeticMateriality, TranslationKey>> = {
  case: "comparison.ignore.case",
  punctuation: "comparison.ignore.punctuation",
  format: "comparison.ignore.format",
};

interface VersionsToolbarProps {
  readonly pair: PairComparisonResult;
  readonly filters: ChangeFilters;
  readonly onFilters: (filters: ChangeFilters) => void;
}

function toggled(
  ignored: ReadonlySet<CosmeticMateriality>,
  materiality: CosmeticMateriality,
): ReadonlySet<CosmeticMateriality> {
  const next = new Set(ignored);
  if (!next.delete(materiality)) next.add(materiality);
  return next;
}

/** Documentos A → B, cuántos cambios hay de cada tipo y qué cambios de forma se ignoran. */
export function VersionsToolbar({ pair, filters, onFilters }: VersionsToolbarProps) {
  const { t, tPlural } = useI18n();
  const counts = countByKind(shownChanges(pair.changes, filters.ignored));
  return (
    <div className={styles.toolbar}>
      <div className={styles.documents}>
        <span className={styles.sideBadge}>{t("comparison.sideA")}</span>
        <span className={styles.documentName}>{pair.firstDocument}</span>
        <Icon name="arrow_forward" size="sm" />
        <span className={styles.sideBadge}>{t("comparison.sideB")}</span>
        <span className={styles.documentName}>{pair.secondDocument}</span>
      </div>
      <div className={styles.counters}>
        {CHANGE_KINDS.map((kind) => (
          <span key={kind} className={styles.counter}>
            <span className={styles.counterValue}>{counts[kind]}</span>
            <span className={joinClassNames(styles.counterLabel, styles[kind])}>
              {tPlural({ key: COUNTER_LABELS[kind], count: counts[kind] })}
            </span>
          </span>
        ))}
      </div>
      <div className={styles.ignores}>
        <span className={styles.ignoreLabel}>{t("comparison.ignore.label")}</span>
        {COSMETIC_MATERIALITIES.map((materiality) => (
          <Checkbox
            key={materiality}
            label={t(IGNORE_LABELS[materiality])}
            checked={filters.ignored.has(materiality)}
            onChange={() => {
              onFilters({ ...filters, ignored: toggled(filters.ignored, materiality) });
            }}
          />
        ))}
      </div>
    </div>
  );
}
