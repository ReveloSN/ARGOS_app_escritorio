import { FileTypeBadge } from "../../components/atoms/FileTypeBadge";
import { Icon } from "../../components/atoms/Icon";
import { useI18n } from "../../i18n/i18nContext";
import type { DocumentReadResult } from "../../services/engine/reviewTypes";
import { fileTypeLabel } from "./fileTypeLabel";
import styles from "./ReviewSteps.module.css";

interface DocumentStatusListProps {
  readonly documents: readonly DocumentReadResult[];
}

/** Pestaña «Archivos»: qué se leyó de cada archivo y por qué quedó fuera el que no se leyó. */
export function DocumentStatusList({ documents }: DocumentStatusListProps) {
  const { t, tPlural } = useI18n();
  return (
    <ul aria-label={t("results.filesLabel")} className={styles.list}>
      {documents.map((document, index) => (
        <li key={`${String(index)}-${document.name}`} className={styles.row}>
          <FileTypeBadge
            format={fileTypeLabel(document.name)}
            isUnreadable={document.status === "unreadable"}
          />
          <span className={styles.fileName}>{document.name}</span>
          {document.reason ? (
            <span className={styles.status}>
              <Icon name="report" size="sm" className={styles.attention} />
              {t(`unreadable.${document.reason}.why`)}
            </span>
          ) : (
            <span className={styles.status}>
              <Icon name="check_circle" size="sm" className={styles.readIcon} />
              {tPlural({ key: "newReview.readStatus", count: document.fragmentCount })}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
