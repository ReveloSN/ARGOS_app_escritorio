import { ErrorMessage } from "../../components/molecules/ErrorMessage";
import { Toast } from "../../components/molecules/Toast";
import { useI18n } from "../../i18n/i18nContext";
import styles from "./AlertViews.module.css";
import type { AlertDecisions } from "./useAlertDecisions";

interface DecisionFeedbackProps {
  readonly decisions: AlertDecisions;
  /** En el bloque de decisión del detalle, en vez de abajo y al centro sobre el contenido. */
  readonly isInline?: boolean;
  /** Con `isInline`: la confirmación ocupa siempre su hueco (Comparar, sobre la lista). */
  readonly reservesSpace?: boolean;
}

/**
 * Confirmación al decidir, con «Deshacer», y el aviso si una decisión no se guardó: ese aviso
 * no desaparece solo, porque la alerta sigue pendiente (mockup «Guardado»).
 */
export function DecisionFeedback({
  decisions,
  isInline = false,
  reservesSpace = false,
}: DecisionFeedbackProps) {
  const { t } = useI18n();
  const { notice, failure } = decisions;
  return (
    <div className={isInline ? styles.feedbackInline : styles.feedback}>
      {failure && (
        <ErrorMessage
          tone="neutral"
          icon="save"
          what={t("decisionFailed.what", { number: failure.alertNumber })}
          why={t("decisionFailed.why")}
          todo={t("decisionFailed.todo")}
          primaryAction={{ label: t("decisionFailed.retry"), onClick: decisions.retry }}
        />
      )}
      <Toast
        message={notice.message}
        visible={notice.isVisible}
        onUndo={notice.isUndoable && decisions.canUndo ? decisions.undo : undefined}
        isInline={isInline}
        reservesSpace={reservesSpace}
      />
    </div>
  );
}
