import { useRef, useState, type ChangeEvent } from "react";

import { Button } from "../../components/atoms/Button";
import { ProgressBar } from "../../components/atoms/ProgressBar";
import { EmptyState } from "../../components/molecules/EmptyState";
import { ErrorMessage } from "../../components/molecules/ErrorMessage";
import { useI18n } from "../../i18n/i18nContext";
import styles from "./Compare.module.css";
import { modeForFiles, type ComparisonProgress, type StartStatus } from "./useStartComparison";

const MIN_FILES = 2;
const ACCEPTED_FILES = ".pdf,.docx,.xlsx,.eml,.txt";

interface CompareStartProps {
  readonly status: StartStatus;
  readonly onFiles: (files: readonly File[]) => void;
}

function ProgressView({ progress }: { progress: ComparisonProgress }) {
  const { t } = useI18n();
  const isComparing = progress.read >= progress.files;
  const label = !isComparing
    ? t("comparison.start.reading", { done: progress.read, total: progress.files })
    : modeForFiles(progress.files) === "versions"
      ? t("comparison.start.aligning", { count: progress.files })
      : t("comparison.start.pairs", { done: progress.compared, total: progress.pairs || 1 });
  const done = isComparing ? progress.compared : progress.read;
  const total = isComparing ? Math.max(progress.pairs, 1) : progress.files;
  return (
    <div className={styles.progress} role="status">
      <span className={styles.progressLabel}>{label}</span>
      <ProgressBar value={done / total} label={label} />
    </div>
  );
}

/** Sin documentos todavía: qué se puede comparar y, si eligió uno solo, por qué no empezó. */
function IdleStart({ isTooFew, onChoose }: { isTooFew: boolean; onChoose: () => void }) {
  const { t } = useI18n();
  return (
    <EmptyState
      isPageLevel
      icon="difference"
      title={t("comparison.start.title")}
      description={t("comparison.start.description")}
      note={t("comparison.start.note")}
      actions={
        <>
          <Button variant="primary" onClick={onChoose}>
            {t("comparison.start.choose")}
          </Button>
          {isTooFew && (
            <p role="status" className={styles.tooFew}>
              {t("comparison.start.needTwo")}
            </p>
          )}
        </>
      }
    />
  );
}

/**
 * Comparar sin resultados todavía: pide los documentos (dos para versiones, tres o más para la
 * matriz), muestra el avance o explica en tres partes que no se pudo comparar.
 */
export function CompareStart({ status, onFiles }: CompareStartProps) {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [isTooFew, setIsTooFew] = useState(false);
  const choose = () => input.current?.click();
  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    // Elegir uno solo no puede quedar en silencio (Nielsen 5): se explica junto al botón.
    setIsTooFew(files.length > 0 && files.length < MIN_FILES);
    if (files.length >= MIN_FILES) onFiles(files);
  };
  return (
    <div className={styles.start}>
      {/* Sin comparación aún no hay CompareHeader: la pantalla se anuncia con su nombre del menú. */}
      <h1 className="visually-hidden">{t("navigation.compare")}</h1>
      <input
        ref={input}
        type="file"
        multiple
        hidden
        accept={ACCEPTED_FILES}
        aria-label={t("comparison.start.choose")}
        onChange={onChange}
      />
      {status.kind === "running" && <ProgressView progress={status.progress} />}
      {status.kind === "failed" && (
        <ErrorMessage
          tone="neutral"
          what={t("comparison.start.failedWhat")}
          why={t("comparison.start.failedWhy")}
          todo={t("comparison.start.failedTodo")}
          primaryAction={{ label: t("comparison.start.choose"), onClick: choose }}
        />
      )}
      {status.kind === "idle" && <IdleStart isTooFew={isTooFew} onChoose={choose} />}
    </div>
  );
}
