import type { ReactNode } from "react";

import { joinClassNames } from "../../components/joinClassNames";
import { useI18n } from "../../i18n/i18nContext";
import type { ChangeResult } from "../../services/engine/comparisonTypes";
import type { DecisionResult } from "../../services/engine/reviewTypes";
import { describeSegmentLocation } from "../alerts/alertPresentation";
import { DECISION_LABELS } from "../alerts/useAlertDecisions";
import { changeRowValues, changeSegment, changeValues } from "./changePresentation";
import styles from "./Compare.module.css";
import { RiskDot } from "./RiskDot";

interface ChangeItemProps {
  readonly change: ChangeResult;
  readonly decision: DecisionResult | undefined;
  readonly isSelected: boolean;
  /** El primero de los que no son de riesgo alto: lleva un pequeño espacio antes. */
  readonly startsOthers: boolean;
  /** «Contra todos»: el documento contra el que ocurre el cambio. */
  readonly against?: string | undefined;
  readonly onSelect: (number: number) => void;
  /** El detalle del cambio elegido se abre aquí mismo, bajo su fila. */
  readonly detail?: ReactNode;
}

/** «+ » si solo se agrega una palabra y «− » si solo se quita; nada en un reemplazo. */
function oneSidedSign(change: ChangeResult, before: string, after: string): string {
  if (change.kind !== "modified" || (before && after)) return "";
  return after ? "+ " : "− ";
}

/** «4857 → 4587»; si solo se agrega o solo se quita, «+ no» o «− plazo»: lo cambiado, no la oración. */
function ItemValues({ change }: { change: ChangeResult }) {
  const { before, after } = changeRowValues(change);
  return (
    <span className={styles.itemValues}>
      {oneSidedSign(change, before, after)}
      {before && <span className={styles.before}>{before}</span>}
      {before && after && " → "}
      {after && <span className={styles.after}>{after}</span>}
    </span>
  );
}

function fullText(change: ChangeResult): string {
  const values = changeValues(change);
  return [values.before, values.after].filter(Boolean).join(" → ");
}

/** Un cambio, en una línea: su texto corto y su ubicación; la decisión tomada, si la hay. */
export function ChangeItem(props: ChangeItemProps) {
  const { t } = useI18n();
  const { change, decision, isSelected, against } = props;
  const segment = changeSegment(change);
  return (
    <li className={joinClassNames(props.startsOthers && styles.itemAfterHigh)}>
      <button
        type="button"
        data-change-row=""
        aria-current={isSelected}
        title={fullText(change)}
        className={joinClassNames(styles.item, isSelected && styles.itemSelected)}
        onClick={() => {
          props.onSelect(change.number);
        }}
      >
        <RiskDot risk={change.risk} />
        <ItemValues change={change} />
        {segment && <span className={styles.itemWhere}>{describeSegmentLocation(segment, t)}</span>}
        {against && (
          <span className={styles.itemAgainst} title={against}>
            {t("comparison.scope.versus", { document: against })}
          </span>
        )}
        {decision && <span className={styles.itemStatus}>{t(DECISION_LABELS[decision.kind])}</span>}
      </button>
      {props.detail}
    </li>
  );
}
