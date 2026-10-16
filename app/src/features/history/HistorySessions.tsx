import { Button } from "../../components/atoms/Button";
import { EmptyState } from "../../components/molecules/EmptyState";
import { ErrorMessage } from "../../components/molecules/ErrorMessage";
import { SessionHistoryTable } from "../../components/organisms/SessionHistoryTable";
import { useI18n } from "../../i18n/i18nContext";
import type { HistoryResult } from "../../services/engine/historyTypes";
import type { QueryState } from "../engine/useEngineQuery";
import { toSessionRow } from "./historyPresentation";
import styles from "./HistoryPage.module.css";

interface HistorySessionsProps {
  readonly state: QueryState<HistoryResult>;
  readonly selectedId: string | undefined;
  readonly onSelect: (id: string) => void;
  readonly onOpen: (id: string) => void;
  readonly onRetry: () => void;
  readonly onNewReview: () => void;
}

/** Las sesiones del periodo, o por qué no se muestran (sin revisiones o el motor no respondió). */
export function HistorySessions(props: HistorySessionsProps) {
  const i18n = useI18n();
  const { t } = i18n;
  const { state } = props;
  if (state.status === "failed") {
    return (
      <div className={styles.sessions}>
        <ErrorMessage
          tone="neutral"
          what={t("history.failed.what")}
          why={t("history.failed.why")}
          todo={t("history.failed.todo")}
          primaryAction={{ label: t("history.retry"), onClick: props.onRetry }}
        />
      </div>
    );
  }
  if (state.status === "loading") return <div className={styles.sessions} aria-busy="true" />;
  if (state.data.sessions.length === 0) {
    return (
      <div className={styles.sessions}>
        <EmptyState
          icon="history"
          title={t("history.empty.title")}
          description={t("history.empty.description")}
          actions={
            <Button variant="primary" onClick={props.onNewReview}>
              {t("navigation.newReview")}
            </Button>
          }
        />
      </div>
    );
  }
  return (
    <div className={styles.sessions}>
      <SessionHistoryTable
        rows={state.data.sessions.map((session) => toSessionRow(session, i18n))}
        selectedId={props.selectedId}
        onSelect={props.onSelect}
        onOpen={props.onOpen}
      />
    </div>
  );
}
