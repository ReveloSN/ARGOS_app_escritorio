import { Button } from "../components/atoms/Button";
import { RiskTag } from "../components/atoms/RiskTag";
import { Breadcrumb } from "../components/molecules/Breadcrumb";
import { ComparisonPanel } from "../components/organisms/ComparisonPanel";
import { alertTitle, entityTypeLabel, toComparedValue } from "../features/review/alertPresentation";
import { useI18n } from "../i18n/i18nContext";
import type { ReviewResult } from "../services/engine/reviewTypes";
import styles from "./Page.module.css";

interface AlertDetailPageProps {
  readonly review: ReviewResult;
  readonly number: number;
  readonly onBack: () => void;
  readonly onOpenAlert: (number: number) => void;
}

/** Detalle de una alerta real: Valor A y Valor B lado a lado, cada uno con su origen. */
export function AlertDetailPage({ review, number, onBack, onOpenAlert }: AlertDetailPageProps) {
  const { t } = useI18n();
  const alert = review.alerts.find((item) => item.number === number);
  if (!alert) return null;
  const total = review.alerts.length;

  return (
    <div className={styles.page}>
      <Breadcrumb
        items={[
          { id: "session", label: review.session.name, onSelect: onBack },
          { id: "alerts", label: t("results.alertsLabel"), onSelect: onBack },
          { id: "alert", label: t("alertDetail.label", { number }) },
        ]}
      />
      <div className={styles.toolbar}>
        <div className={styles.grow}>
          <div className={styles.tags}>
            <RiskTag level={alert.risk} variant="long" />
            <span>{entityTypeLabel(alert, t)}</span>
            <span>{t("alertDetail.position", { number, total })}</span>
          </div>
          <h1 className={styles.title}>{alertTitle(alert, t)}</h1>
        </div>
        <div className={styles.actions}>
          <Button
            size="md"
            disabled={number <= 1}
            onClick={() => {
              onOpenAlert(number - 1);
            }}
          >
            {t("alertDetail.previous")}
          </Button>
          <Button
            size="md"
            disabled={number >= total}
            onClick={() => {
              onOpenAlert(number + 1);
            }}
          >
            {t("alertDetail.next")}
          </Button>
        </div>
      </div>
      <ComparisonPanel
        first={toComparedValue(alert.first, alert.highlightPositions, t)}
        second={toComparedValue(alert.second, alert.highlightPositions, t)}
      />
    </div>
  );
}
