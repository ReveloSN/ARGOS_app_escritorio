import { Button } from "../../components/atoms/Button";
import { RiskSummary } from "../../components/molecules/RiskSummary";
import { useI18n } from "../../i18n/i18nContext";
import styles from "./SessionOverview.module.css";
import type { ReviewDigest } from "./sessionSnapshot";

interface ReviewOverviewProps {
  readonly review: ReviewDigest;
  readonly onContinue: () => void;
}

/** Documentos cargados y alertas pendientes por riesgo: las mismas cifras de la barra lateral. */
export function ReviewOverview({ review, onContinue }: ReviewOverviewProps) {
  const { t, tPlural } = useI18n();
  const pending = review.isClosed
    ? t("home.overview.closed")
    : tPlural({
        key: "review.pendingSummary",
        count: review.pendingCount,
        params: { total: review.alertCount },
      });
  return (
    <section aria-label={t("home.overview.label")} className={styles.review}>
      <h1 className={styles.name}>{review.name}</h1>
      <p className={styles.figure}>
        {tPlural({ key: "home.overview.documents", count: review.documentCount })}
      </p>
      <p className={styles.figure}>{pending}</p>
      <div role="group" aria-label={t("home.overview.riskList")}>
        <RiskSummary counts={review.pendingByRisk} />
      </div>
      <Button variant="primary" onClick={onContinue}>
        {t(review.isClosed ? "home.overview.viewResults" : "home.overview.continue")}
      </Button>
    </section>
  );
}
