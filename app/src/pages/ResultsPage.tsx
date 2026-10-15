import { Button } from "../components/atoms/Button";
import { Breadcrumb } from "../components/molecules/Breadcrumb";
import { EmptyState } from "../components/molecules/EmptyState";
import { AlertList } from "../components/organisms/AlertList";
import { toAlertRow } from "../features/review/alertPresentation";
import { useI18n } from "../i18n/i18nContext";
import type { ReviewResult } from "../services/engine/reviewTypes";
import styles from "./Page.module.css";

interface ResultsPageProps {
  readonly review: ReviewResult;
  readonly onOpenAlert: (number: number) => void;
  readonly onNewReview: () => void;
}

/** Resultados de la revisión: solo existe con datos reales devueltos por el motor. */
export function ResultsPage({ review, onOpenAlert, onNewReview }: ResultsPageProps) {
  const { t, tPlural } = useI18n();
  const readCount = review.documents.filter((document) => document.status === "read").length;
  const total = review.documents.length;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Breadcrumb
          items={[
            { id: "session", label: review.session.name },
            { id: "alerts", label: t("results.alertsLabel") },
          ]}
        />
        <h1 className={styles.title}>{review.session.name}</h1>
        <span className={styles.summary}>
          {tPlural({ key: "results.readSummary", count: readCount, params: { total } })}
        </span>
      </div>
      {review.alerts.length === 0 ? (
        <EmptyState
          isReassuring
          icon="check"
          title={t("results.noInconsistencies")}
          description={tPlural({ key: "results.comparedFiles", count: readCount })}
          actions={<Button onClick={onNewReview}>{t("navigation.newReview")}</Button>}
        />
      ) : (
        <>
          <span className={styles.summary}>
            {tPlural({ key: "results.alertCount", count: review.alerts.length })}
          </span>
          <AlertList
            rows={review.alerts.map((alert) => toAlertRow(alert, t))}
            onSelect={(id) => {
              onOpenAlert(Number(id));
            }}
          />
        </>
      )}
    </div>
  );
}
