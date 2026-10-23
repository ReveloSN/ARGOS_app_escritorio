import { Button } from "../../components/atoms/Button";
import { Icon } from "../../components/atoms/Icon";
import { DecisionPanel } from "../../components/organisms/DecisionPanel";
import { useI18n } from "../../i18n/i18nContext";
import { decisionOf, pendingCount } from "./alertDecisions";
import type { AlertDetailViewProps } from "./AlertDetailView";
import styles from "./AlertViews.module.css";
import { correctionHint } from "./correctionHint";

/**
 * La decisión de la alerta: el panel «¿Cómo quiere continuar?» en una revisión abierta, o la
 * nota de solo lectura si está cerrada. Al decidir la última, ofrece cerrar la revisión.
 */
export function DetailDecision({ review, alert, decisions, onCloseReview }: AlertDetailViewProps) {
  const i18n = useI18n();
  const { t, format } = i18n;
  const current = decisionOf(review, alert.number);
  if (decisions.isReadOnly) {
    const closedAt = review.session.closedAt ? new Date(review.session.closedAt) : new Date();
    return (
      <p className={styles.readOnly}>
        <Icon name="lock" size="sm" />
        {t("alertDetail.readOnly", { date: format.dateTime(closedAt) })}
      </p>
    );
  }
  const correctSide = current?.correctSide ?? undefined;
  return (
    <>
      <DecisionPanel
        current={current?.kind}
        correctSide={correctSide}
        values={{ first: alert.first.value, second: alert.second?.value }}
        correctionHint={correctionHint(alert, correctSide, i18n)}
        onDecide={(kind) => {
          decisions.decide({ alertNumber: alert.number, kind });
        }}
        onChooseCorrect={(side) => {
          decisions.decide({ alertNumber: alert.number, kind: "error", correctSide: side });
        }}
      />
      {pendingCount(review) === 0 && (
        <div className={styles.allDecided}>
          <span className={styles.grow}>{t("alertDetail.allDecided")}</span>
          <Button variant="primary" size="md" onClick={onCloseReview}>
            {t("results.closeReview")}
          </Button>
        </div>
      )}
    </>
  );
}
