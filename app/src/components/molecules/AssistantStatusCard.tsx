import { useI18n } from "../../i18n/i18nContext";
import { ArgusEye } from "../atoms/ArgusEye";
import type { EyeState } from "../atoms/eyeShapes";
import { joinClassNames } from "../joinClassNames";
import styles from "./AssistantStatusCard.module.css";

export interface AssistantSummary {
  readonly eye: EyeState;
  /** «Listo», «3 alertas de riesgo alto»…: siempre visible, aunque el ojo esté oculto. */
  readonly text: string;
  readonly isHighRisk: boolean;
  readonly isEyeShown: boolean;
}

interface AssistantStatusCardProps {
  readonly assistant: AssistantSummary;
  readonly isCompact: boolean;
}

/** Estado del asistente de IA en la barra lateral; contraída queda solo el ojo con su etiqueta. */
export function AssistantStatusCard({ assistant, isCompact }: AssistantStatusCardProps) {
  const { t } = useI18n();
  const label = t("assistant.label", { status: assistant.text });
  return (
    <div
      role="status"
      aria-label={label}
      title={isCompact ? label : undefined}
      className={isCompact ? styles.compact : styles.card}
    >
      {assistant.isEyeShown && <ArgusEye state={assistant.eye} size="sm" />}
      <span className={isCompact ? "visually-hidden" : styles.texts}>
        <span className={styles.name}>{t("assistant.name")}</span>
        <span className={joinClassNames(styles.text, assistant.isHighRisk && styles.high)}>
          {assistant.text}
        </span>
      </span>
    </div>
  );
}
