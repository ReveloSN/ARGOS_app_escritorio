import { FileTypeBadge } from "../../components/atoms/FileTypeBadge";
import { Icon } from "../../components/atoms/Icon";
import { ErrorMessage } from "../../components/molecules/ErrorMessage";
import { UploadZone } from "../../components/organisms/UploadZone";
import { useI18n } from "../../i18n/i18nContext";
import { fileTypeLabel } from "./fileTypeLabel";
import styles from "./ReviewSteps.module.css";

interface FileSelectionStepProps {
  readonly files: readonly File[];
  readonly hasFailed: boolean;
  readonly onAdd: (files: readonly File[]) => void;
  readonly onRemove: (index: number) => void;
  readonly onRetry: () => void;
}

/** Paso 1 · Cargar: los archivos que se van a comparar. */
export function FileSelectionStep({
  files,
  hasFailed,
  onAdd,
  onRemove,
  onRetry,
}: FileSelectionStepProps) {
  const { t } = useI18n();
  return (
    <>
      <UploadZone onFilesSelected={onAdd} />
      <h2 className={styles.heading}>{t("newReview.files")}</h2>
      {files.length === 0 ? (
        <p className={styles.muted}>{t("newReview.noFiles")}</p>
      ) : (
        <ul className={styles.list}>
          {files.map((file, index) => (
            <li key={`${String(index)}-${file.name}`} className={styles.row}>
              <FileTypeBadge format={fileTypeLabel(file.name)} />
              <span className={styles.fileName}>{file.name}</span>
              <button
                type="button"
                className={styles.remove}
                aria-label={t("newReview.removeFile", { name: file.name })}
                onClick={() => {
                  onRemove(index);
                }}
              >
                <Icon name="close" size="sm" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {hasFailed && (
        <ErrorMessage
          tone="neutral"
          icon="report"
          what={t("analysisFailed.what")}
          why={t("analysisFailed.why")}
          todo={t("analysisFailed.todo")}
          primaryAction={{ label: t("analysisFailed.retry"), onClick: onRetry }}
        />
      )}
    </>
  );
}
