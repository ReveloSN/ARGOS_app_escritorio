import { joinClassNames } from "../../components/joinClassNames";
import { Icon } from "../../components/atoms/Icon";
import { DecisionButtons } from "../../components/molecules/DecisionButtons";
import { useI18n } from "../../i18n/i18nContext";
import type { DecisionResult } from "../../services/engine/reviewTypes";
import type { AlertDecisions } from "../alerts/useAlertDecisions";
import { DECISION_LABELS } from "../alerts/useAlertDecisions";
import type { ExplainTarget } from "../explanation/explainTarget";
import { ExplanationPanel } from "../explanation/ExplanationPanel";
import styles from "./Compare.module.css";

/** Lo que muestra el detalle de un cambio o de una inconsistencia. */
export interface ItemDetailContent {
  readonly number: number;
  readonly icon: string;
  readonly kind: string;
  readonly location: string;
  readonly title: string;
  /** Solo los cambios: el nivel completo de riesgo vive aquí y en ningún otro lugar. */
  readonly risk?: "high" | "medium" | "low" | undefined;
  /** Los valores de una inconsistencia; un cambio los muestra en su explicación. */
  readonly values: readonly { readonly label: string; readonly value: string }[];
  /** Solo los cambios tienen la explicación estructurada. */
  readonly explain?: ExplainTarget | undefined;
}

interface ItemDetailProps {
  readonly content: ItemDetailContent;
  readonly decision: DecisionResult | undefined;
  readonly decisions: AlertDecisions;
}

/** «Se guardó: …» con Deshacer, y los botones Es correcto / Es un error / Ignorar. */
function DecisionArea({ content, decision, decisions }: ItemDetailProps) {
  const { t } = useI18n();
  return (
    <>
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
        emphasis={content.risk === "high" ? "error" : undefined}
        subject={t(
          content.explain ? "comparison.detail.aboutChange" : "comparison.detail.aboutData",
        )}
        onDecide={(kind) => {
          decisions.decide({ alertNumber: content.number, kind });
        }}
      />
    </>
  );
}

function InconsistencyValues({ content }: { content: ItemDetailContent }) {
  const { t } = useI18n();
  return (
    <>
      <h2 className={styles.detailTitle}>{content.title}</h2>
      <dl className={styles.detailValues}>
        {content.values.map((item) => (
          <div key={item.label} className={styles.detailValue}>
            <dt>{item.label}</dt>
            <dd>{item.value || t("comparison.detail.empty")}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

const RISK_ICONS = { high: "report", medium: "warning", low: "info" } as const;

/** El único lugar con el nivel completo: palabra e icono; el medio y el bajo van en gris. */
function RiskLevel({ risk }: { readonly risk: "high" | "medium" | "low" }) {
  const { t } = useI18n();
  return (
    <span className={joinClassNames(styles.riskLevel, risk === "high" && styles.riskLevelHigh)}>
      <Icon name={RISK_ICONS[risk]} size="xs" />
      {t(`risk.${risk}Long`)}
    </span>
  );
}

/** El elemento elegido y su decisión (C, E, I) con deshacer (Ctrl Z). */
export function ItemDetail(props: ItemDetailProps) {
  const { content } = props;
  return (
    <section aria-label={content.title} className={styles.detail}>
      <span className={styles.detailKind}>
        <Icon name={content.icon} size="xs" />
        {content.kind}
        <span className={styles.itemLocation}> · {content.location}</span>
      </span>
      {content.risk && <RiskLevel risk={content.risk} />}
      {content.explain ? (
        <ExplanationPanel
          target={content.explain}
          actions={<DecisionArea {...props} />}
          isCompact
        />
      ) : (
        <>
          <InconsistencyValues content={content} />
          <DecisionArea {...props} />
        </>
      )}
    </section>
  );
}
