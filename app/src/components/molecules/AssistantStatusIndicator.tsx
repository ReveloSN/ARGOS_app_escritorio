import { Icon } from "../atoms/Icon";
import { ProgressBar } from "../atoms/ProgressBar";
import { joinClassNames } from "../joinClassNames";
import styles from "./AssistantStatusIndicator.module.css";

export interface AssistantStatusLine {
  readonly text: string;
  readonly isHighRisk: boolean;
  /** Mientras lee: archivos leídos y total, para la barra de avance. */
  readonly progress?: { readonly done: number; readonly total: number } | undefined;
  /** Con el motor detenido: «Reintentar». */
  readonly retry?: { readonly label: string; readonly onClick: () => void } | undefined;
}

// El estado se comunica con texto e icono, no solo con color (CLAUDE.md §9).
export function AssistantStatusIndicator({ status }: { readonly status: AssistantStatusLine }) {
  const { text, isHighRisk, progress, retry } = status;
  return (
    <div role="status" className={joinClassNames(styles.status, isHighRisk && styles.high)}>
      {progress && (
        <span className={styles.progress}>
          <ProgressBar value={progress.done / progress.total} label={text} />
        </span>
      )}
      {isHighRisk && <Icon name="report" size="sm" />}
      {text}
      {retry && (
        <button type="button" className={styles.retry} onClick={retry.onClick}>
          {retry.label}
        </button>
      )}
    </div>
  );
}
