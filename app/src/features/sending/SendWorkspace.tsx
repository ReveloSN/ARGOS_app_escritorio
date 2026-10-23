import { Button } from "../../components/atoms/Button";
import { MODIFIER_KEY } from "../../components/atoms/Kbd";
import { joinClassNames } from "../../components/joinClassNames";
import { Breadcrumb } from "../../components/molecules/Breadcrumb";
import { ErrorMessage } from "../../components/molecules/ErrorMessage";
import { Toast } from "../../components/molecules/Toast";
import { useI18n } from "../../i18n/i18nContext";
import type { SendReviewResult } from "../../services/engine/sendTypes";
import { useTimedNotice } from "../alerts/useTimedNotice";
import { useShortcuts } from "../keyboard/useShortcuts";
import { useReview } from "../review/reviewContext";
import { DraftView } from "./DraftView";
import { summaryTexts } from "./issuePresentation";
import { IssuePanel } from "./IssuePanel";
import styles from "./Send.module.css";
import { useSendReview } from "./sendContext";
import { useOpenCorrected, useSendDecisions } from "./useSendDecisions";

const OPEN_SHORTCUT = [MODIFIER_KEY, "Enter"];

function SendHeader({ review }: { review: SendReviewResult }) {
  const { t } = useI18n();
  const { review: caseFile } = useReview();
  const { discardReview } = useSendReview();
  const root = caseFile ? caseFile.session.name : t("navigation.send");
  return (
    <div className={styles.header}>
      <Breadcrumb
        items={[
          { id: "root", label: root },
          { id: "send", label: t("navigation.send") },
        ]}
      />
      <div className={styles.titleRow}>
        <h1 className={styles.title}>{t("navigation.send")}</h1>
        <span className={styles.fileName}>{review.draft.fileName}</span>
        <Button size="md" onClick={discardReview}>
          {t("sending.changeDraft")}
        </Button>
      </div>
    </div>
  );
}

/** «Revisar antes de enviar»: borrador marcado, problemas con sus acciones y la copia corregida. */
export function SendWorkspace({ review }: { review: SendReviewResult }) {
  const texts = useI18n();
  const notice = useTimedNotice();
  const decisions = useSendDecisions(notice);
  const opener = useOpenCorrected(notice);
  const summary = summaryTexts(review, texts);
  useShortcuts([
    { key: "Enter", withModifier: true, isActiveWhileTyping: true, run: opener.open },
    { key: "z", withModifier: true, run: decisions.undo },
  ]);
  return (
    <div className={styles.workspace}>
      <SendHeader review={review} />
      <div className={styles.main}>
        <div className={styles.draftColumn}>
          <DraftView review={review} />
        </div>
        <IssuePanel review={review} decisions={decisions} />
      </div>
      <div className={styles.footer}>
        {opener.hasFailed && (
          <ErrorMessage
            tone="neutral"
            icon="mail"
            what={texts.t("sending.openFailed.what")}
            why={texts.t("sending.openFailed.why")}
            todo={texts.t("sending.openFailed.todo")}
            primaryAction={{ label: texts.t("sending.openFailed.retry"), onClick: opener.open }}
          />
        )}
        <span
          className={joinClassNames(styles.footerText, summary.isBlocking && styles.footerBlocking)}
        >
          {summary.footer}
        </span>
        <Toast
          message={notice.message}
          visible={notice.isVisible}
          onUndo={notice.isUndoable && decisions.canUndo ? decisions.undo : undefined}
        />
        <Button
          variant={summary.isBlocking ? "secondary" : "primary"}
          size="md"
          shortcut={OPEN_SHORTCUT}
          onClick={opener.open}
        >
          {texts.t("sending.openInMail")}
        </Button>
      </div>
    </div>
  );
}
