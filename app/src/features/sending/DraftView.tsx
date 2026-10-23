import { joinClassNames } from "../../components/joinClassNames";
import { useI18n } from "../../i18n/i18nContext";
import type { SendReviewResult } from "../../services/engine/sendTypes";
import { fileTypeLabel } from "../review/fileTypeLabel";
import { markRuns, paragraphsOf, type DraftMark } from "./draftMarks";
import styles from "./Send.module.css";
import { correctedAttachments, correctedRecipients, pendingIssues } from "./sendState";

const BYTES_PER_KILOBYTE = 1024;

function kilobytes(size: number): number {
  return Math.max(1, Math.ceil(size / BYTES_PER_KILOBYTE));
}

interface DraftViewProps {
  readonly review: SendReviewResult;
}

function MarkedText({ text, marks }: { text: string; marks: readonly DraftMark[] }) {
  return markRuns(text, marks).map((run, index) =>
    run.kind === "text" ? (
      <span key={index}>{run.text}</span>
    ) : (
      <span key={index}>
        <mark className={joinClassNames(styles.mark, styles[run.mark.risk])}>{run.text}</mark>
        <sup className={styles.markNumber}>{run.mark.number}</sup>
      </span>
    ),
  );
}

function pendingMarks(review: SendReviewResult, part: string): DraftMark[] {
  return pendingIssues(review)
    .filter((issue) => issue.part === part)
    .map((issue) => ({ text: issue.markedText, number: issue.number, risk: issue.risk }));
}

function Recipients({ review, part }: { review: SendReviewResult; part: "to" | "cc" }) {
  const { t } = useI18n();
  const shown = correctedRecipients(review, review.draft[part]);
  const text = shown.length ? shown.join(", ") : t("sending.draft.noCopy");
  return (
    <>
      <span className={styles.headerLabel}>{t(`sending.draft.${part}`)}</span>
      <span className={styles.address}>
        <MarkedText text={text} marks={pendingMarks(review, part)} />
      </span>
    </>
  );
}

function Attachments({ review }: DraftViewProps) {
  const { t } = useI18n();
  const attachments = correctedAttachments(review);
  return (
    <div className={styles.attachments}>
      <span className={styles.attachmentsTitle}>
        {t("sending.draft.attachments", { count: attachments.length })}
      </span>
      <ul className={styles.attachmentList} aria-label={t("sending.draft.attachmentsLabel")}>
        {attachments.map((item) => (
          <li
            key={item.name}
            className={joinClassNames(styles.attachment, item.isAdded && styles.attachmentAdded)}
          >
            <span className={styles.fileType}>{fileTypeLabel(item.name)}</span>
            <span className={styles.address}>{item.name}</span>
            {item.size !== null && (
              <span className={styles.size}>
                {t("sending.draft.size", { size: kilobytes(item.size) })}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** El borrador como lo verá el destinatario, con cada problema pendiente marcado y numerado. */
export function DraftView({ review }: DraftViewProps) {
  const { t } = useI18n();
  const bodyMarks = pendingMarks(review, "body");
  return (
    <article className={styles.draft} aria-label={t("sending.draft.label")}>
      <div className={styles.draftHeader}>
        <Recipients review={review} part="to" />
        <Recipients review={review} part="cc" />
        <span className={styles.headerLabel}>{t("sending.draft.subject")}</span>
        <span className={styles.subject}>{review.draft.subject}</span>
      </div>
      <div className={styles.body}>
        {paragraphsOf(review.draft.body).map((paragraph, index) => (
          <p key={index} className={styles.paragraph}>
            <MarkedText text={paragraph} marks={bodyMarks} />
          </p>
        ))}
      </div>
      <Attachments review={review} />
    </article>
  );
}
