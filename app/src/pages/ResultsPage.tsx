import { AlertsTab } from "../features/alerts/AlertsTab";
import { DecisionCardList } from "../features/alerts/DecisionCardList";
import { DecisionFeedback } from "../features/alerts/DecisionFeedback";
import { NoInconsistencies } from "../features/alerts/NoInconsistencies";
import { ResultsHeader } from "../features/alerts/ResultsHeader";
import { useResultsView } from "../features/alerts/resultsViewContext";
import { useAlertDecisions } from "../features/alerts/useAlertDecisions";
import { DocumentStatusList } from "../features/review/DocumentStatusList";
import type { ReviewCloser } from "../features/review/useCloseReview";
import type { ReviewResult } from "../services/engine/reviewTypes";
import styles from "./ResultsPage.module.css";

interface ResultsPageProps {
  readonly review: ReviewResult;
  readonly closer: ReviewCloser;
  readonly onOpenAlert: (number: number) => void;
  readonly onSearchDocuments?: ((query: string) => void) | undefined;
}

/** Resultados de la revisión: solo existe con datos reales devueltos por el motor. */
export function ResultsPage({ review, closer, onOpenAlert, onSearchDocuments }: ResultsPageProps) {
  const { tab } = useResultsView();
  const decisions = useAlertDecisions();
  const hasAlerts = review.alerts.length > 0;

  return (
    <div className={styles.layout}>
      <ResultsHeader review={review} closer={closer} />
      {tab === "alerts" && hasAlerts && (
        <AlertsTab
          review={review}
          decisions={decisions}
          onOpenAlert={onOpenAlert}
          onSearchDocuments={onSearchDocuments}
        />
      )}
      {tab === "alerts" && !hasAlerts && <NoInconsistencies review={review} closer={closer} />}
      {tab === "files" && (
        <div className={styles.tabContent}>
          <DocumentStatusList documents={review.documents} />
        </div>
      )}
      {tab === "decisions" && (
        <div className={styles.cards}>
          <DecisionCardList review={review} onOpenAlert={onOpenAlert} />
        </div>
      )}
      <DecisionFeedback decisions={decisions} />
    </div>
  );
}
