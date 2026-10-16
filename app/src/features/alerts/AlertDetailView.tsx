import { Button } from "../../components/atoms/Button";
import { DecisionTag } from "../../components/atoms/DecisionTag";
import { RiskTag } from "../../components/atoms/RiskTag";
import { DifferenceLine } from "../../components/molecules/DifferenceLine";
import { ComparisonPanel } from "../../components/organisms/ComparisonPanel";
import { useI18n } from "../../i18n/i18nContext";
import type { AlertResult, AlertSideResult, ReviewResult } from "../../services/engine/reviewTypes";
import { decisionStateOf } from "./alertDecisions";
import {
  alertTitle,
  describeLocation,
  entityTypeLabel,
  openLabelFor,
  toComparedValue,
} from "./alertPresentation";
import styles from "./AlertViews.module.css";
import { DetailDecision } from "./DetailDecision";
import { describeDifference } from "./differenceDescription";
import { explanationText } from "./explanationText";
import { OpenDocumentFailure } from "./OpenDocumentFailure";
import type { AlertDecisions } from "./useAlertDecisions";
import type { DocumentOpener } from "./useOpenDocument";

export interface AlertDetailViewProps {
  readonly review: ReviewResult;
  readonly alert: AlertResult;
  readonly decisions: AlertDecisions;
  readonly opener: DocumentOpener;
  readonly onOpenAlert: (number: number) => void;
  readonly onCloseReview: () => void;
}

/** Detalle de una alerta: los dos valores con su origen, qué cambia y la decisión. */
export function AlertDetailView(props: AlertDetailViewProps) {
  const i18n = useI18n();
  const { t } = i18n;
  const { review, alert, opener, onOpenAlert } = props;
  const total = review.alerts.length;
  const difference = describeDifference(alert, i18n);
  const compared = (side: AlertSideResult) => {
    const [origin] = side.occurrences;
    return {
      ...toComparedValue(side, alert.highlightPositions, t),
      openLabel: openLabelFor(side, t),
      onOpen:
        origin &&
        (() => {
          opener.open(origin.document, describeLocation(origin.location, t));
        }),
    };
  };
  return (
    <div className={styles.detail}>
      <div className={styles.titleRow}>
        <div className={styles.heading}>
          <div className={styles.tags}>
            <RiskTag level={alert.risk} variant="long" />
            <span className={styles.typeTag}>{entityTypeLabel(alert.entityType, t)}</span>
            <DecisionTag state={decisionStateOf(review, alert.number)} />
            {alert.differenceKind === "referenced_period" && (
              // Salida de la IA local: se muestra como sugerencia con su confianza (CLAUDE.md §8).
              <span className={styles.typeTag}>
                {t("alertDetail.aiSuggestion", {
                  confidence: i18n.format.percent(alert.confidence),
                })}
              </span>
            )}
            <span>{t("alertDetail.position", { number: alert.number, total })}</span>
          </div>
          <h1 className={styles.title}>{alertTitle(alert, t)}</h1>
          <p className={styles.explanation}>{explanationText(alert.explanation, i18n)}</p>
        </div>
        <div className={styles.navigation}>
          <Button
            size="md"
            shortcut={["K"]}
            disabled={alert.number <= 1}
            onClick={() => {
              onOpenAlert(alert.number - 1);
            }}
          >
            {t("alertDetail.previous")}
          </Button>
          <Button
            size="md"
            shortcut={["J"]}
            disabled={alert.number >= total}
            onClick={() => {
              onOpenAlert(alert.number + 1);
            }}
          >
            {t("alertDetail.next")}
          </Button>
        </div>
      </div>
      {opener.failure && (
        <OpenDocumentFailure failure={opener.failure} onDismiss={opener.dismiss} />
      )}
      <ComparisonPanel first={compared(alert.first)} second={compared(alert.second)} />
      <DifferenceLine {...difference} />
      <DetailDecision {...props} />
    </div>
  );
}
