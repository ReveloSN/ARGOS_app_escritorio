import { FileTypeBadge } from "../../components/atoms/FileTypeBadge";
import { Icon } from "../../components/atoms/Icon";
import { useI18n } from "../../i18n/i18nContext";
import type { DocumentReadResult } from "../../services/engine/reviewTypes";
import { fileTypeLabel } from "./fileTypeLabel";
import { readStatusText } from "./readOutcomeText";
import styles from "./ReviewSteps.module.css";
import { UnreadableFileMessage } from "./UnreadableFileMessage";

interface ReadConfirmationStepProps {
  readonly documents: readonly DocumentReadResult[];
  readonly onReplace: () => void;
  readonly onActivateOcr: (document: DocumentReadResult) => void;
}

/** Paso 2 · Confirmar lectura: qué leyó el motor en cada archivo y cuáles necesitan atención. */
export function ReadConfirmationStep({
  documents,
  onReplace,
  onActivateOcr,
}: ReadConfirmationStepProps) {
  const { t } = useI18n();
  return (
    <>
      <h2 className={styles.heading}>
        {t("newReview.files")}
        <span className={styles.hint}>{t("newReview.filesHint")}</span>
      </h2>
      <ul className={styles.list}>
        {documents.map((document, index) => (
          <li key={`${String(index)}-${document.name}`} className={styles.row}>
            <FileTypeBadge
              format={fileTypeLabel(document.name)}
              isUnreadable={document.status === "unreadable"}
            />
            <span className={styles.fileName}>{document.name}</span>
            <ReadStatus document={document} onReplace={onReplace} onActivateOcr={onActivateOcr} />
          </li>
        ))}
      </ul>
    </>
  );
}

function ReadStatus({
  document,
  onReplace,
  onActivateOcr,
}: {
  document: DocumentReadResult;
  onReplace: () => void;
  onActivateOcr: (document: DocumentReadResult) => void;
}) {
  const i18n = useI18n();
  if (document.reason) {
    return (
      <UnreadableFileMessage
        document={document}
        onReplace={onReplace}
        onActivateOcr={() => {
          onActivateOcr(document);
        }}
      />
    );
  }
  return (
    <span className={styles.status}>
      <Icon name="check_circle" size="sm" className={styles.readIcon} />
      {readStatusText(document, i18n)}
    </span>
  );
}
