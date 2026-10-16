import { useState } from "react";

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
  readonly onNewReview: () => void;
}

/** Historial: sesiones del periodo, métricas de uso y las decisiones de la sesión elegida. */
export function HistoryPage({
  selectedId,
  onOpenReview,
  onOpenAlert,
  onNewReview,
}: HistoryPageProps) {
  const { history, reviews } = useEngineServices();
  const { showReview } = useReview();
  const [days, setDays] = useState(DEFAULT_PERIOD_DAYS);
  const [selected, setSelected] = useState(selectedId);
  const query = useEngineQuery(String(days), () => history.history(days));
  const sessions = query.state.status === "ready" ? query.state.data.sessions : [];
  const current = selected ?? sessions[0]?.id;
  const open = (review: ReviewResult) => {
    showReview(review);
    onOpenReview();
  };

  return (
    <div className={styles.layout}>
      <HistoryHeader days={days} state={query.state} onDaysChange={setDays} />
      <HistorySessions
        state={query.state}
        selectedId={current}
        onSelect={setSelected}
        onOpen={(id) => {
          void reviews.openReview(id).then(open, query.reload);
        }}
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
