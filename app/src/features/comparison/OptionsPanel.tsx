import type { ReactNode } from "react";

import { Button } from "../../components/atoms/Button";
import { Checkbox } from "../../components/atoms/Checkbox";
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

export interface OptionsPanelProps {
  /** Los cambios del alcance, después de ignorar los de forma: lo que cuentan los chips. */
  readonly changes: readonly ChangeResult[];
  readonly filters: ChangeFilters;
  readonly onFilters: (filters: ChangeFilters) => void;
  /** Los selectores de documento base y «contra». */
  readonly scopeSelector: ReactNode;
  readonly isMinimapShown: boolean;
  readonly onMinimapShown: (isShown: boolean) => void;
  readonly onOpenMatrix: () => void;
}

function toggled(
  ignored: ReadonlySet<CosmeticMateriality>,
  materiality: CosmeticMateriality,
): ReadonlySet<CosmeticMateriality> {
  const next = new Set(ignored);
  if (!next.delete(materiality)) next.add(materiality);
  return next;
}

function Row({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div className={styles.optionsRow}>
      <span className={styles.ignoreLabel}>{label}</span>
      {children}
    </div>
  );
}

function TypeChips({ changes, filters, onFilters }: OptionsPanelProps) {
  const { t } = useI18n();
  const counts = countByKind(changes);
  return TYPE_CHIPS.map((chip) => (
    <button
      key={chip.type}
      type="button"
      aria-pressed={filters.type === chip.type}
      className={joinClassNames(styles.chip, filters.type === chip.type && styles.chipActive)}
      onClick={() => {
        onFilters({ ...filters, type: chip.type });
      }}
    >
      {t(chip.label)} {chip.type === "all" ? changes.length : counts[chip.type]}
    </button>
  ));
}

/** Lo secundario de Comparar: qué comparar, qué ignorar, qué mostrar, el minimapa y la leyenda. */
export function OptionsPanel(props: OptionsPanelProps) {
  const { t } = useI18n();
  const { filters, onFilters } = props;
  return (
    <>
      {props.scopeSelector}
      <Row label={t("comparison.ignore.label")}>
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
      </Row>
      <Checkbox
        label={t("comparison.list.importantOnly")}
        checked={filters.isImportantOnly}
        onChange={(checked) => {
          onFilters({ ...filters, isImportantOnly: checked });
        }}
      />
      <Row label={t("comparison.options.typeLabel")}>
        <TypeChips {...props} />
      </Row>
      <Checkbox
        label={t("comparison.options.minimap")}
        checked={props.isMinimapShown}
        onChange={props.onMinimapShown}
      />
      <Row label={t("comparison.options.legendLabel")}>
        <span className={styles.legend}>{t("comparison.panel.legendFirst")}</span>
        <span className={styles.legend}>{t("comparison.panel.legendSecond")}</span>
      </Row>
      <Button variant="secondary" onClick={props.onOpenMatrix}>
        {t("comparison.options.matrix")}
      </Button>
    </>
  );
}
