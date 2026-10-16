import { Button } from "../../components/atoms/Button";
import { ErrorMessage } from "../../components/molecules/ErrorMessage";
import { useI18n } from "../../i18n/i18nContext";
import type { ReviewResult } from "../../services/engine/reviewTypes";
import { DecisionCardList } from "../alerts/DecisionCardList";
import type { QueryState } from "../engine/useEngineQuery";
import styles from "./HistoryPage.module.css";

interface SessionDecisionsAsideProps {
  readonly state: QueryState<ReviewResult>;
  readonly onRetry: () => void;
  readonly onOpenReview: (review: ReviewResult) => void;
  readonly onOpenAlert: (review: ReviewResult, number: number) => void;
}

/** «Decisiones de la sesión»: lo que se decidió en la sesión seleccionada del historial. */
export function SessionDecisionsAside({
  state,
  onRetry,
  onOpenReview,
  onOpenAlert,
}: SessionDecisionsAsideProps) {
  const { t, format } = useI18n();
  if (state.status === "loading") return <aside className={styles.aside} aria-busy="true" />;
  if (state.status === "failed") {
    return (
      <aside className={styles.aside}>
        <ErrorMessage
          tone="neutral"
          what={t("history.sessionFailed.what")}
          why={t("history.sessionFailed.why")}
          todo={t("history.sessionFailed.todo")}
          primaryAction={{ label: t("history.retry"), onClick: onRetry }}
        />
      </aside>
    );
  }
  const review = state.data;
  const { closedAt, createdAt } = review.session;
  const when = closedAt
    ? t("history.closedOn", { date: format.dateTime(new Date(closedAt)) })
    : t("history.inProgressSince", { date: format.dateTime(new Date(createdAt)) });
  return (
    <aside aria-label={t("history.decisionsLabel")} className={styles.aside}>
      <div className={styles.asideHeader}>
        <span className={styles.asideLabel}>{t("history.decisionsLabel")}</span>
        <span className={styles.asideName}>{review.session.name}</span>
        <span className={styles.asideWhen}>{when}</span>
        <Button
          size="md"
          icon="open_in_new"
          onClick={() => {
            onOpenReview(review);
          }}
        >
          {t("history.openReview")}
        </Button>
      </div>
      <DecisionCardList
        review={review}
        onOpenAlert={(number) => {
          onOpenAlert(review, number);
        }}
      />
    </aside>
  );
}
