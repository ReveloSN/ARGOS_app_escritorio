import { Icon } from "../../components/atoms/Icon";
import { ProgressBar } from "../../components/atoms/ProgressBar";
import { useI18n } from "../../i18n/i18nContext";
import type { TranslationKey } from "../../i18n/translate";
import { formatDuration } from "../history/formatDuration";
import { finishedCount, type FileReadStatus, type ReadingState } from "./readingProgress";
import styles from "./ReviewSteps.module.css";

const STATUS_APPEARANCE: Readonly<
  Record<FileReadStatus, { readonly icon: string; readonly label: TranslationKey }>
> = {
  waiting: { icon: "schedule", label: "reading.waiting" },
  reading: { icon: "hourglass_top", label: "reading.reading" },
  read: { icon: "check_circle", label: "reading.read" },
  unreadable: { icon: "report", label: "reading.unreadable" },
};

/** «Leyendo 3 de 5 archivos · ≈ 40 s restantes», con el estado de cada archivo. */
export function ReadingProgressPanel({ reading }: { readonly reading: ReadingState }) {
  const { t } = useI18n();
  const done = finishedCount(reading);
  const total = reading.files.length;
  const heading = reading.isComparing
    ? t("reading.comparing")
    : t("reading.progress", { done, total });
  return (
    <section aria-label={t("reading.label")} aria-busy="true" className={styles.reading}>
      <div className={styles.readingHeader}>
        <h2 className={styles.heading}>{heading}</h2>
        {reading.remainingSeconds !== undefined && (
          <span className={styles.hint}>
            {t("reading.remaining", { time: formatDuration(reading.remainingSeconds, t) })}
          </span>
        )}
      </div>
      <ProgressBar value={total ? done / total : 0} label={heading} />
      <ul className={styles.list}>
        {reading.files.map((file, index) => (
          <li key={`${String(index)}-${file.name}`} className={styles.progressRow}>
            <span className={styles.fileName}>{file.name}</span>
            <span className={styles.status}>
              <Icon name={STATUS_APPEARANCE[file.status].icon} size="sm" />
              {t(STATUS_APPEARANCE[file.status].label)}
            </span>
          </li>
        ))}
      </ul>
      <p className={styles.muted}>{t("reading.note")}</p>
    </section>
  );
}
