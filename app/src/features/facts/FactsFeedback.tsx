import { ErrorMessage } from "../../components/molecules/ErrorMessage";
import { Toast } from "../../components/molecules/Toast";
import { useI18n } from "../../i18n/i18nContext";
import styles from "./Facts.module.css";
import type { FactChanges, FactFailure } from "./useFactChanges";

interface FactsFeedbackProps {
  readonly changes: FactChanges;
  readonly canUndo: boolean;
}

function FailureMessage({ failure, onDismiss }: { failure: FactFailure; onDismiss: () => void }) {
  const { t } = useI18n();
  const value = failure.unrecognizedValue;
  return (
    <ErrorMessage
      tone="neutral"
      icon="save"
      what={t("facts.failed.what", { label: failure.label })}
      why={
        value === null ? t("facts.failed.unavailable") : t("facts.failed.unrecognized", { value })
      }
      todo={value === null ? t("facts.failed.todoUnavailable") : t("facts.failed.todoUnrecognized")}
      primaryAction={
        value === null
          ? { label: t("facts.failed.retry"), onClick: failure.retry }
          : { label: t("facts.failed.dismiss"), onClick: onDismiss }
      }
    />
  );
}

/** «Se guardó…» con «Deshacer», o por qué no se guardó el cambio y qué hacer. */
export function FactsFeedback({ changes, canUndo }: FactsFeedbackProps) {
  const { notice, failure } = changes;
  return (
    <div className={styles.feedback}>
      {failure && <FailureMessage failure={failure} onDismiss={changes.dismiss} />}
      <Toast
        message={notice.message}
        visible={notice.isVisible}
        onUndo={notice.isUndoable && canUndo ? changes.undo : undefined}
      />
    </div>
  );
}
