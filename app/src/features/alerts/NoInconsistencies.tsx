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

const MIN_DOCUMENTS_TO_COMPARE = 2;

/** Con un solo archivo leído no hay nada que comparar: no se dice que todo coincide. */
function NothingToCompare({ review, closer }: NoInconsistenciesProps) {
  const { t } = useI18n();
  return (
    <EmptyState
      icon="info"
      title={t("results.nothingToCompare")}
      description={t("results.nothingToCompareDescription")}
      actions={
        !isReadOnly(review) && (
          <Button variant="primary" onClick={closer.close}>
            {t("results.closeReview")}
          </Button>
        )
      }
    />
  );
}

/** «No se encontraron inconsistencias», con tono tranquilizador (mockup de estados). */
export function NoInconsistencies({ review, closer }: NoInconsistenciesProps) {
  const { t, tPlural } = useI18n();
  const { setTab } = useResultsView();
  const read = review.documents.filter((document) => document.status === "read").length;
  const unread = review.documents.length - read;
  const hasUnread = unread > 0;
  if (read < MIN_DOCUMENTS_TO_COMPARE) return <NothingToCompare review={review} closer={closer} />;
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
