import { Checkbox } from "../../components/atoms/Checkbox";
import { Icon } from "../../components/atoms/Icon";
import { joinClassNames } from "../../components/joinClassNames";
import { useI18n } from "../../i18n/i18nContext";
import type { TranslationKey } from "../../i18n/translate";
import type { ChangeResult } from "../../services/engine/comparisonTypes";
import type { DecisionResult } from "../../services/engine/reviewTypes";
import { describeLocation } from "../alerts/alertPresentation";
import { DECISION_LABELS } from "../alerts/useAlertDecisions";
import { countByKind, type ChangeFilters, type ChangeTypeFilter } from "./changeFilters";
import { CHANGE_KIND_APPEARANCE, changeSegment, changeValues } from "./changePresentation";
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

function ChangeItem({
  change,
  decision,
  isSelected,
  onSelect,
}: {
  change: ChangeResult;
  decision: DecisionResult | undefined;
  isSelected: boolean;
  onSelect: (number: number) => void;
}) {
  const { t } = useI18n();
  const appearance = CHANGE_KIND_APPEARANCE[change.kind];
  const values = changeValues(change);
  const segment = changeSegment(change);
  return (
    <li>
      <button
        type="button"
        aria-current={isSelected}
        className={joinClassNames(styles.item, isSelected && styles.itemSelected)}
        onClick={() => {
          onSelect(change.number);
        }}
      >
        <span className={styles.itemNumber}>{change.number}</span>
        <span className={styles.itemBody}>
          <span className={joinClassNames(styles.itemKind, styles[change.kind])}>
            <Icon name={appearance.icon} size="xs" />
            {t(appearance.label)}
            {segment && (
              <span className={styles.itemLocation}>
                {" "}
                · {describeLocation(segment.location, t)}
              </span>
            )}
          </span>
          <span className={styles.itemValues}>
            {values.before && <span className={styles.before}>{values.before}</span>}
            {values.before && values.after && " → "}
            {values.after && <span className={styles.after}>{values.after}</span>}
          </span>
          {decision && (
            <span className={styles.itemStatus}>{t(DECISION_LABELS[decision.kind])}</span>
          )}
        </span>
      </button>
    </li>
  );
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
