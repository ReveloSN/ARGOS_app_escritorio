import { Icon } from "../../components/atoms/Icon";
import { joinClassNames } from "../../components/joinClassNames";
import { useI18n } from "../../i18n/i18nContext";
import type { ChangeResult } from "../../services/engine/comparisonTypes";
import type { DecisionResult } from "../../services/engine/reviewTypes";
import { describeLocation } from "../alerts/alertPresentation";
import { DECISION_LABELS } from "../alerts/useAlertDecisions";
import { CHANGE_KIND_APPEARANCE, changeSegment, changeValues } from "./changePresentation";
import styles from "./Compare.module.css";
import { meaningLabel } from "./meaningLabel";

interface ChangeItemProps {
  readonly change: ChangeResult;
  readonly decision: DecisionResult | undefined;
  readonly isSelected: boolean;
  readonly onSelect: (number: number) => void;
}

function ItemValues({ change }: { change: ChangeResult }) {
  const values = changeValues(change);
  return (
    <span className={styles.itemValues}>
      {values.before && <span className={styles.before}>{values.before}</span>}
      {values.before && values.after && " → "}
      {values.after && <span className={styles.after}>{values.after}</span>}
    </span>
  );
}

/** Un cambio de la lista: tipo, lugar, valores, sugerencia de IA y decisión tomada. */
export function ChangeItem({ change, decision, isSelected, onSelect }: ChangeItemProps) {
  const { t } = useI18n();
  const appearance = CHANGE_KIND_APPEARANCE[change.kind];
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
          <ItemValues change={change} />
          <span className={styles.itemFooter}>
            {change.meaning && <span>{meaningLabel(change.meaning, t)}</span>}
            {decision && (
              <span className={styles.itemStatus}>{t(DECISION_LABELS[decision.kind])}</span>
            )}
          </span>
        </span>
      </button>
    </li>
  );
}
