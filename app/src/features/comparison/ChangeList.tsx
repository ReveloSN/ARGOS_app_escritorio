import { Checkbox } from "../../components/atoms/Checkbox";
import { joinClassNames } from "../../components/joinClassNames";
import { useI18n } from "../../i18n/i18nContext";
import type { TranslationKey } from "../../i18n/translate";
import type { ChangeResult } from "../../services/engine/comparisonTypes";
import type { DecisionResult } from "../../services/engine/reviewTypes";
import { ChangeItem } from "./ChangeItem";
import { countByKind, type ChangeFilters, type ChangeTypeFilter } from "./changeFilters";
import styles from "./Compare.module.css";

const TYPE_CHIPS: readonly { readonly type: ChangeTypeFilter; readonly label: TranslationKey }[] = [
  { type: "all", label: "comparison.types.all" },
  { type: "removed", label: "comparison.types.removed" },
  { type: "added", label: "comparison.types.added" },
  { type: "modified", label: "comparison.types.modified" },
  { type: "moved", label: "comparison.types.moved" },
];

interface ChangeListProps {
  /** Los cambios después de ignorar los de forma: lo que cuentan los chips. */
  readonly shown: readonly ChangeResult[];
  readonly visible: readonly ChangeResult[];
  readonly filters: ChangeFilters;
  readonly decisions: readonly DecisionResult[];
  readonly selected: number | undefined;
  readonly onFilters: (filters: ChangeFilters) => void;
  readonly onSelect: (number: number) => void;
}

/** Lista de cambios con «Solo cambios importantes» y filtro por tipo (J / K para navegar). */
export function ChangeList(props: ChangeListProps) {
  const { t } = useI18n();
  const counts = countByKind(props.shown);
  return (
    <div className={styles.listPanel}>
      <div className={styles.listHeader}>
        <span className={styles.listTitle}>{t("comparison.list.title")}</span>
        <span className={styles.listCount}>
          {t("comparison.list.count", { visible: props.visible.length, total: props.shown.length })}
        </span>
        <span className={styles.listHint}>{t("comparison.list.navigate")}</span>
      </div>
      <Checkbox
        label={t("comparison.list.importantOnly")}
        checked={props.filters.isImportantOnly}
        onChange={(checked) => {
          props.onFilters({ ...props.filters, isImportantOnly: checked });
        }}
      />
      <div className={styles.chips}>
        {TYPE_CHIPS.map((chip) => (
          <button
            key={chip.type}
            type="button"
            aria-pressed={props.filters.type === chip.type}
            className={joinClassNames(
              styles.chip,
              props.filters.type === chip.type && styles.chipActive,
            )}
            onClick={() => {
              props.onFilters({ ...props.filters, type: chip.type });
            }}
          >
            {t(chip.label)} {chip.type === "all" ? props.shown.length : counts[chip.type]}
          </button>
        ))}
      </div>
      <ul aria-label={t("comparison.list.title")} className={styles.items}>
        {props.visible.map((change) => (
          <ChangeItem
            key={change.number}
            change={change}
            decision={props.decisions.find((decision) => decision.alertNumber === change.number)}
            isSelected={props.selected === change.number}
            onSelect={props.onSelect}
          />
        ))}
      </ul>
      {!props.visible.length && <p className={styles.emptyList}>{t("comparison.list.empty")}</p>}
    </div>
  );
}
