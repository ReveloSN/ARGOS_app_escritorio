import type { ReactNode } from "react";

import { joinClassNames } from "../../components/joinClassNames";
import { useI18n } from "../../i18n/i18nContext";
import type { ChangeResult } from "../../services/engine/comparisonTypes";
import type { DecisionResult } from "../../services/engine/reviewTypes";
import { describeLocation } from "../alerts/alertPresentation";
import { DECISION_LABELS } from "../alerts/useAlertDecisions";
import { changeSegment, changeValues } from "./changePresentation";
import styles from "./Compare.module.css";

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

/** Solo el riesgo alto lleva marca: un punto rojo con su nombre, nunca solo color. */
function RiskDot({ risk }: { readonly risk: ChangeResult["risk"] }) {
  const { t } = useI18n();
  if (risk !== "high") return <span aria-hidden="true" className={styles.riskDotSpace} />;
  return <span role="img" aria-label={t("risk.highLong")} className={styles.riskDot} />;
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
        aria-current={isSelected}
        title={fullText(change)}
        className={joinClassNames(styles.item, isSelected && styles.itemSelected)}
        onClick={() => {
          props.onSelect(change.number);
        }}
      >
        <RiskDot risk={change.risk} />
        <ItemValues change={change} />
        {segment && (
          <span className={styles.itemWhere}>{describeLocation(segment.location, t)}</span>
        )}
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
