import { Icon } from "../../components/atoms/Icon";
import { DecisionButtons } from "../../components/molecules/DecisionButtons";
import { useI18n } from "../../i18n/i18nContext";
import type { DecisionResult } from "../../services/engine/reviewTypes";
import type { AlertDecisions } from "../alerts/useAlertDecisions";
import { DECISION_LABELS } from "../alerts/useAlertDecisions";
import styles from "./Compare.module.css";

/** Lo que muestra el detalle de un cambio o de una inconsistencia. */
export interface ItemDetailContent {
  readonly number: number;
  readonly icon: string;
  readonly kind: string;
  readonly location: string;
  readonly title: string;
  readonly values: readonly { readonly label: string; readonly value: string }[];
}

interface ItemDetailProps {
  readonly content: ItemDetailContent;
  readonly decision: DecisionResult | undefined;
  readonly decisions: AlertDecisions;
}

/** El elemento elegido, sus valores y la decisión (C, E, I) con deshacer (Ctrl Z). */
export function ItemDetail({ content, decision, decisions }: ItemDetailProps) {
  const { t } = useI18n();
  return (
    <section aria-label={content.title} className={styles.detail}>
      <span className={styles.detailKind}>
        <Icon name={content.icon} size="xs" />
        {content.kind}
        <span className={styles.itemLocation}> · {content.location}</span>
      </span>
      <h2 className={styles.detailTitle}>{content.title}</h2>
      <dl className={styles.detailValues}>
        {content.values.map((item) => (
          <div key={item.label} className={styles.detailValue}>
            <dt>{item.label}</dt>
            <dd>{item.value || t("comparison.detail.empty")}</dd>
          </div>
        ))}
      </dl>
      {decision && (
        <div role="status" className={styles.saved}>
          <Icon name="check" size="sm" />
          {t("comparison.detail.saved", { decision: t(DECISION_LABELS[decision.kind]) })}
          {decisions.canUndo && (
            <button type="button" className={styles.link} onClick={decisions.undo}>
              {t("actions.undo")}
            </button>
          )}
        </div>
      )}
      <DecisionButtons
        current={decision?.kind}
        onDecide={(kind) => {
          decisions.decide({ alertNumber: content.number, kind });
        }}
      />
    </section>
  );
}
