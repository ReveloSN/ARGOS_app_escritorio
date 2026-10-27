import { ErrorMessage } from "../../components/molecules/ErrorMessage";
import { useI18n } from "../../i18n/i18nContext";
import type { DocumentReadResult } from "../../services/engine/reviewTypes";
import { unreadableKeys } from "../review/readOutcomeText";
import styles from "./Compare.module.css";

interface UnreadableDocumentsProps {
  readonly documents: readonly DocumentReadResult[];
  readonly onClose: () => void;
}

/** Los archivos que no se pudieron leer: qué pasó, por qué y qué hacer, uno por archivo. */
export function UnreadableDocuments({ documents, onClose }: UnreadableDocumentsProps) {
  const { t } = useI18n();
  return (
    <div className={styles.unreadable}>
      {documents.map((document) => {
        const keys = unreadableKeys(document);
        if (!keys) return null;
        return (
          <ErrorMessage
            key={document.name}
            tone="neutral"
            what={t(keys.what, { name: document.name })}
            why={t(keys.why)}
            todo={t(keys.todo)}
            primaryAction={{ label: t("comparison.close.action"), onClick: onClose }}
          />
        );
      })}
    </div>
  );
}
