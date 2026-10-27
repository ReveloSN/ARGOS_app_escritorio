import { useId, useState } from "react";

import { Checkbox } from "../../components/atoms/Checkbox";
import { Icon } from "../../components/atoms/Icon";
import { joinClassNames } from "../../components/joinClassNames";
import { useI18n } from "../../i18n/i18nContext";
import type { TranslationKey } from "../../i18n/translate";
import type { ChangeResult } from "../../services/engine/comparisonTypes";
import {
  COSMETIC_MATERIALITIES,
  countByKind,
  type ChangeFilters,
  type ChangeTypeFilter,
  type CosmeticMateriality,
} from "./changeFilters";
import styles from "./Compare.module.css";

const TYPE_CHIPS: readonly { readonly type: ChangeTypeFilter; readonly label: TranslationKey }[] = [
  { type: "all", label: "comparison.types.all" },
  { type: "removed", label: "comparison.types.removed" },
  { type: "added", label: "comparison.types.added" },
  { type: "modified", label: "comparison.types.modified" },
  { type: "moved", label: "comparison.types.moved" },
];
const IGNORE_LABELS: Readonly<Record<CosmeticMateriality, TranslationKey>> = {
  case: "comparison.ignore.case",
  punctuation: "comparison.ignore.punctuation",
  format: "comparison.ignore.format",
};

interface ComparisonOptionsProps {
  /** Los cambios del alcance, después de ignorar los de forma: lo que cuentan los chips. */
  readonly changes: readonly ChangeResult[];
  readonly filters: ChangeFilters;
  readonly onFilters: (filters: ChangeFilters) => void;
}

function activeCount(filters: ChangeFilters): number {
  return filters.ignored.size + Number(filters.isImportantOnly) + Number(filters.type !== "all");
}

function toggled(
  ignored: ReadonlySet<CosmeticMateriality>,
  materiality: CosmeticMateriality,
): ReadonlySet<CosmeticMateriality> {
  const next = new Set(ignored);
  if (!next.delete(materiality)) next.add(materiality);
  return next;
}

/** Lo secundario de Comparar (filtros y leyenda), plegado: lo esencial queda a la vista. */
export function ComparisonOptions({ changes, filters, onFilters }: ComparisonOptionsProps) {
  const { t, tPlural } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();
  const counts = countByKind(changes);
  const active = activeCount(filters);
  return (
    <div className={styles.options}>
      <button
        type="button"
        className={styles.optionsToggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => {
          setIsOpen((current) => !current);
        }}
      >
        <Icon name={isOpen ? "expand_less" : "expand_more"} size="sm" />
        {t("comparison.options.label")}
        {active > 0 && (
          <span className={styles.optionsCount}>
            {tPlural({ key: "comparison.options.active", count: active })}
          </span>
        )}
      </button>
      {isOpen && (
        <div id={panelId} className={styles.optionsPanel}>
          <div className={styles.optionsRow}>
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
          <Checkbox
            label={t("comparison.list.importantOnly")}
            checked={filters.isImportantOnly}
            onChange={(checked) => {
              onFilters({ ...filters, isImportantOnly: checked });
            }}
          />
          <div className={styles.optionsRow}>
            <span className={styles.ignoreLabel}>{t("comparison.options.typeLabel")}</span>
            {TYPE_CHIPS.map((chip) => (
              <button
                key={chip.type}
                type="button"
                aria-pressed={filters.type === chip.type}
                className={joinClassNames(
                  styles.chip,
                  filters.type === chip.type && styles.chipActive,
                )}
                onClick={() => {
                  onFilters({ ...filters, type: chip.type });
                }}
              >
                {t(chip.label)} {chip.type === "all" ? changes.length : counts[chip.type]}
              </button>
            ))}
          </div>
          <div className={styles.optionsRow}>
            <span className={styles.ignoreLabel}>{t("comparison.options.legendLabel")}</span>
            <span className={styles.legend}>{t("comparison.panel.legendFirst")}</span>
            <span className={styles.legend}>{t("comparison.panel.legendSecond")}</span>
          </div>
        </div>
      )}
    </div>
  );
}
