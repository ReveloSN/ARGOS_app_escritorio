import { useI18n } from "../../i18n/i18nContext";
import type { ReviewResult } from "../../services/engine/reviewTypes";
import styles from "./ReviewSummaryLine.module.css";

/** «5 archivos · 4 leídos · revisado el 13/10/2026 09:42», y la fecha de cierre si la tiene. */
export function ReviewSummaryLine({ review }: { readonly review: ReviewResult }) {
  const { t, tPlural, format } = useI18n();
  const read = review.documents.filter((document) => document.status === "read").length;
  const parts = [
    tPlural({ key: "results.fileCount", count: review.documents.length }),
    tPlural({ key: "results.readCount", count: read }),
    t("results.reviewedAt", { date: format.dateTime(new Date(review.session.createdAt)) }),
  ];
  if (review.session.closedAt) {
    parts.push(t("results.closedAt", { date: format.dateTime(new Date(review.session.closedAt)) }));
  }
  return <span className={styles.summary}>{parts.join(" · ")}</span>;
}
