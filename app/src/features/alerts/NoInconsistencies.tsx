import { Button } from "../../components/atoms/Button";
import { EmptyState } from "../../components/molecules/EmptyState";
import { useI18n } from "../../i18n/i18nContext";
import type { ReviewResult } from "../../services/engine/reviewTypes";
import type { ReviewCloser } from "../review/useCloseReview";
import { isReadOnly } from "./alertDecisions";
import { useResultsView } from "./resultsViewContext";

interface NoInconsistenciesProps {
  readonly review: ReviewResult;
  readonly closer: ReviewCloser;
}

/** «No se encontraron inconsistencias», con tono tranquilizador (mockup de estados). */
export function NoInconsistencies({ review, closer }: NoInconsistenciesProps) {
  const { t, tPlural } = useI18n();
  const { setTab } = useResultsView();
  const read = review.documents.filter((document) => document.status === "read").length;
  const unread = review.documents.length - read;
  const hasUnread = unread > 0;
  const compared = tPlural({ key: "results.comparedFiles", count: read });
  return (
    <EmptyState
      isReassuring={!hasUnread}
      icon={hasUnread ? "info" : "check"}
      title={t(hasUnread ? "results.noInconsistenciesInRead" : "results.noInconsistencies")}
      description={
        hasUnread
          ? `${compared} ${tPlural({ key: "results.unreadFiles", count: unread })}`
          : compared
      }
      actions={
        <>
          {!isReadOnly(review) && (
            <Button variant="primary" onClick={closer.close}>
              {t("results.closeReview")}
            </Button>
          )}
          <Button
            onClick={() => {
              setTab("files");
            }}
          >
            {t("results.showCompared")}
          </Button>
        </>
      }
    />
  );
}
