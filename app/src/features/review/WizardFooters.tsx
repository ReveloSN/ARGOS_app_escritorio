import { Button } from "../../components/atoms/Button";
import { MODIFIER_KEY } from "../../components/atoms/Kbd";
import { useI18n } from "../../i18n/i18nContext";
import styles from "./ReviewSteps.module.css";

const CONTINUE_SHORTCUT = [MODIFIER_KEY, "↵"];

interface SelectionFooterProps {
  readonly fileCount: number;
  readonly isReading: boolean;
  readonly onCancel: () => void;
  readonly onAnalyze: () => void;
}

export function SelectionFooter({
  fileCount,
  isReading,
  onCancel,
  onAnalyze,
}: SelectionFooterProps) {
  const { t, tPlural } = useI18n();
  return (
    <>
      <span role="status" className={styles.footerMessage}>
        {isReading && tPlural({ key: "newReview.analyzing", count: fileCount })}
      </span>
      <Button variant="tertiary" onClick={onCancel}>
        {t("newReview.cancel")}
      </Button>
      <Button
        variant="primary"
        shortcut={CONTINUE_SHORTCUT}
        disabled={fileCount === 0 || isReading}
        onClick={onAnalyze}
      >
        {tPlural({ key: "newReview.analyze", count: fileCount })}
      </Button>
    </>
  );
}

interface ConfirmationFooterProps {
  readonly readCount: number;
  readonly unreadCount: number;
  readonly onCancel: () => void;
  readonly onBack: () => void;
  readonly onContinue: () => void;
}

export function ConfirmationFooter(props: ConfirmationFooterProps) {
  const { t, tPlural } = useI18n();
  return (
    <>
      <span className={styles.footerMessage}>
        {props.unreadCount > 0 &&
          tPlural({ key: "newReview.notIncluded", count: props.unreadCount })}
      </span>
      <Button variant="tertiary" onClick={props.onCancel}>
        {t("newReview.cancel")}
      </Button>
      <Button onClick={props.onBack}>{t("newReview.back")}</Button>
      <Button
        variant="primary"
        shortcut={CONTINUE_SHORTCUT}
        disabled={props.readCount === 0}
        onClick={props.onContinue}
      >
        {tPlural({ key: "newReview.reviewFiles", count: props.readCount })}
      </Button>
    </>
  );
}
