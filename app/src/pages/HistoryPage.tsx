import { useState } from "react";
import { joinClassNames } from "../components/joinClassNames";

import { useComparison } from "../features/comparison/comparisonContext";
import { useEngineServices } from "../features/engine/EngineServicesContext";
import { useEngineQuery } from "../features/engine/useEngineQuery";
import { HistoryHeader } from "../features/history/HistoryHeader";
import styles from "../features/history/HistoryPage.module.css";
import { HistorySessions } from "../features/history/HistorySessions";
import { SelectedSessionAside } from "../features/history/SelectedSessionAside";
import { useReview } from "../features/review/reviewContext";
import type { ReviewResult } from "../services/engine/reviewTypes";

const DEFAULT_PERIOD_DAYS = 30;

interface HistoryPageProps {
  readonly selectedId?: string | undefined;
  readonly onOpenReview: () => void;
  readonly onOpenAlert: (number: number) => void;
  readonly onOpenComparison: () => void;
  readonly onNewReview: () => void;
}

/** Historial: sesiones del periodo, métricas de uso y las decisiones de la sesión elegida. */
export function HistoryPage({
  selectedId,
  onOpenReview,
  onOpenAlert,
  onOpenComparison,
  onNewReview,
}: HistoryPageProps) {
  const { history, reviews, comparisons } = useEngineServices();
  const { showComparison } = useComparison();
  const { showReview } = useReview();
  const [days, setDays] = useState(DEFAULT_PERIOD_DAYS);
  const [selected, setSelected] = useState(selectedId);
  const [failedOpenId, setFailedOpenId] = useState<string | undefined>(undefined);
  const [failedComparisonId, setFailedComparisonId] = useState<string | undefined>(undefined);
  const query = useEngineQuery(String(days), () => history.history(days));
  const sessions = query.state.status === "ready" ? query.state.data.sessions : [];
  const current = selected ?? sessions[0]?.id;
  const open = (review: ReviewResult) => {
    showReview(review);
    onOpenReview();
  };

  const openSession = (id: string) => {
    setFailedOpenId(undefined);
    void reviews.openReview(id).then(open, () => {
      setFailedOpenId(id);
    });
  };

  const openComparison = (id: string) => {
    setFailedComparisonId(undefined);
    void comparisons.openComparison(id).then(
      (comparison) => {
        showComparison(comparison);
        onOpenComparison();
      },
      () => {
        setFailedComparisonId(id);
      },
    );
  };

  return (
    <div className={joinClassNames(styles.layout, !current && styles.noSelection)}>
      <HistoryHeader days={days} state={query.state} onDaysChange={setDays} />
      <HistorySessions
        state={query.state}
        selectedId={current}
        onSelect={setSelected}
        onOpen={openSession}
        failedOpenId={failedOpenId}
        onOpenComparison={openComparison}
        failedComparisonId={failedComparisonId}
        onRetry={query.reload}
        onNewReview={onNewReview}
      />
      {current && (
        <SelectedSessionAside
          key={current}
          sessionId={current}
          onOpenReview={open}
          onOpenAlert={(review, number) => {
            showReview(review);
            onOpenAlert(number);
          }}
        />
      )}
    </div>
  );
}
