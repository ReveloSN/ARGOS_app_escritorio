import { RiskTag } from "../../components/atoms/RiskTag";
import { joinClassNames } from "../../components/joinClassNames";
import { useI18n } from "../../i18n/i18nContext";
import type { SendIssueResult, SendReviewResult } from "../../services/engine/sendTypes";
import type { AlertDecisions } from "../alerts/useAlertDecisions";
import { issueTexts, summaryTexts } from "./issuePresentation";
import styles from "./Send.module.css";
import { decisionOf } from "./sendState";
import { AssistantEye } from "../assistant/AssistantEye";

interface IssuePanelProps {
  readonly review: SendReviewResult;
  readonly decisions: AlertDecisions;
}

function IssueActions({
  issue,
  label,
  decisions,
}: {
  issue: SendIssueResult;
  label: string;
  decisions: AlertDecisions;
}) {
  const { t } = useI18n();
  const decide = (kind: "error" | "correct" | "ignored") => () => {
    decisions.decide({ alertNumber: issue.number, kind });
  };
  return (
    <div className={styles.issueActions}>
      <button type="button" className={styles.fixButton} onClick={decide("error")}>
        {label}
      </button>
      <button type="button" className={styles.secondaryButton} onClick={decide("correct")}>
        {t("sending.actions.correct")}
      </button>
      <button type="button" className={styles.secondaryButton} onClick={decide("ignored")}>
        {t("sending.actions.ignore")}
      </button>
    </div>
  );
}

function IssueCard({ review, issue, decisions }: IssuePanelProps & { issue: SendIssueResult }) {
  const texts = useI18n();
  const shown = issueTexts(review, issue, texts);
  const isDecided = decisionOf(review, issue) !== undefined;
  return (
    <li className={joinClassNames(styles.issue, isDecided && styles.issueDecided)}>
      <div className={styles.issueHeader}>
        <span className={styles.issueNumber}>{issue.number}</span>
        <RiskTag level={issue.risk} compact />
        <span className={styles.issueKind}>{texts.t(`sending.issue.${issue.kind}.kind`)}</span>
        {isDecided && <span className={styles.issueStatus}>{shown.status}</span>}
      </div>
      <span className={styles.issueTitle}>{shown.title}</span>
      <span className={styles.issueBody}>{shown.body}</span>
      {!isDecided && !decisions.isReadOnly && (
        <IssueActions issue={issue} label={shown.fixLabel} decisions={decisions} />
      )}
    </li>
  );
}

/** Panel lateral: el estado del borrador con el ojo de ARGUS y cada problema con sus acciones. */
export function IssuePanel({ review, decisions }: IssuePanelProps) {
  const texts = useI18n();
  const summary = summaryTexts(review, texts);
  return (
    <aside className={styles.panel} aria-label={texts.t("sending.panel.label")}>
      <div className={styles.summary}>
        <AssistantEye state={summary.eye} size="md" label={summary.headline} />
        <div className={styles.summaryText}>
          <span className={styles.headline}>{summary.headline}</span>
          <span className={styles.subline}>{summary.subline}</span>
        </div>
      </div>
      <ul className={styles.issues} aria-label={texts.t("sending.panel.issues")}>
        {review.issues.map((issue) => (
          <IssueCard key={issue.number} review={review} issue={issue} decisions={decisions} />
        ))}
      </ul>
    </aside>
  );
}
