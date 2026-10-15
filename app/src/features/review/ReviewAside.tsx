import { Icon } from "../../components/atoms/Icon";
import { TextField } from "../../components/atoms/TextField";
import { useI18n } from "../../i18n/i18nContext";
import type { DocumentReadResult } from "../../services/engine/reviewTypes";
import styles from "./ReviewSteps.module.css";

function LocalAnalysisNote() {
  const { t } = useI18n();
  return (
    <span className={styles.note}>
      <Icon name="lock" size="sm" />
      {t("newReview.localNote")}
    </span>
  );
}

interface SessionNameAsideProps {
  readonly name: string;
  readonly isNameMissing: boolean;
  readonly onNameChange: (name: string) => void;
}

export function SessionNameAside({ name, isNameMissing, onNameChange }: SessionNameAsideProps) {
  const { t } = useI18n();
  return (
    <>
      <TextField
        label={t("newReview.sessionName")}
        value={name}
        onChange={onNameChange}
        {...(isNameMissing ? { error: t("newReview.sessionNameRequired") } : {})}
      />
      <LocalAnalysisNote />
    </>
  );
}

export function ReadSummaryAside({ documents }: { documents: readonly DocumentReadResult[] }) {
  const { t } = useI18n();
  const readCount = documents.filter((document) => document.status === "read").length;
  return (
    <>
      <h2 className={styles.heading}>{t("newReview.readSummary")}</h2>
      <dl className={styles.summary}>
        <dt>{t("newReview.readComplete")}</dt>
        <dd className={styles.count}>{readCount}</dd>
        <dt>{t("newReview.needAttention")}</dt>
        <dd className={`${styles.count ?? ""} ${styles.attention ?? ""}`}>
          {documents.length - readCount}
        </dd>
      </dl>
      <LocalAnalysisNote />
    </>
  );
}
