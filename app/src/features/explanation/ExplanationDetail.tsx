import { Icon } from "../../components/atoms/Icon";
import { useI18n } from "../../i18n/i18nContext";
import type { ChangeExplanationResult } from "../../services/engine/aiTypes";
import { AssistantEye } from "../assistant/AssistantEye";
import type { QueryState } from "../engine/useEngineQuery";
import type { ExplainQuote } from "./explainTarget";
import styles from "./ExplanationPanel.module.css";
import { ExplanationResult } from "./ExplanationResult";

interface DetailToggleProps {
  readonly isOpen: boolean;
  readonly onToggle: () => void;
}

/** «Ver detalle»: el texto largo se pide y se muestra solo cuando la persona lo abre. */
export function DetailToggle({ isOpen, onToggle }: DetailToggleProps) {
  const { t } = useI18n();
  return (
    <button type="button" aria-expanded={isOpen} className={styles.detailToggle} onClick={onToggle}>
      <Icon name={isOpen ? "expand_less" : "expand_more"} size="sm" />
      {t("explainPanel.detail")}
    </button>
  );
}

interface DetailBodyProps {
  readonly state: QueryState<ChangeExplanationResult | null>;
  readonly quotes: readonly ExplainQuote[];
  readonly onRetry: () => void;
}

/** El estado del texto largo: preparando (el asistente «explica»), fallo o el texto con su origen. */
export function DetailBody({ state, quotes, onRetry }: DetailBodyProps) {
  const { t } = useI18n();
  if (state.status === "ready" && state.data) {
    return <ExplanationResult result={state.data} quotes={quotes} onRetry={onRetry} />;
  }
  const hasFailed = state.status === "failed";
  return (
    <div role="status" className={styles.explaining}>
      <AssistantEye state={hasFailed ? "error" : "explaining"} size="sm" />
      {t(hasFailed ? "explain.failed" : "explain.loading")}
    </div>
  );
}
