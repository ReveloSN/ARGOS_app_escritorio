import { useEffect, useState } from "react";

import { Icon } from "../../components/atoms/Icon";
import { useI18n } from "../../i18n/i18nContext";
import { useAssistantSignals } from "../assistant/assistantContext";
import { AssistantEye } from "../assistant/AssistantEye";
import { useEngineServices } from "../engine/EngineServicesContext";
import { useEngineQuery } from "../engine/useEngineQuery";
import { explanationKey, requestExplanation, type ExplainTarget } from "./explainTarget";
import styles from "./ExplanationPanel.module.css";
import { ExplanationResult } from "./ExplanationResult";

function ExplanationBody({ target }: { target: ExplainTarget }) {
  const { t, locale } = useI18n();
  const { ai } = useEngineServices();
  const query = useEngineQuery(explanationKey(target, locale), () =>
    requestExplanation(ai, target, locale),
  );
  if (query.state.status === "ready") {
    return (
      <ExplanationResult result={query.state.data} quotes={target.quotes} onRetry={query.reload} />
    );
  }
  const hasFailed = query.state.status === "failed";
  return (
    <div role="status" className={styles.explaining}>
      <AssistantEye state={hasFailed ? "error" : "explaining"} size="sm" />
      {t(hasFailed ? "explain.failed" : "explain.loading")}
    </div>
  );
}

/** Mientras el panel está abierto, la barra lateral dice «Explicando un cambio». */
function useExplainingSignal(isOpen: boolean) {
  const { setExplaining } = useAssistantSignals();
  useEffect(() => {
    if (!isOpen) return undefined;
    setExplaining(true);
    return () => {
      setExplaining(false);
    };
  }, [isOpen, setExplaining]);
}

/**
 * «Explicar este cambio» o «Explicar esta alerta»: se pide al abrirlo; plantilla local o
 * «Sugerencia de IA» citada. La decisión sigue siendo del usuario.
 */
export function ExplanationPanel({ target }: { target: ExplainTarget }) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  useExplainingSignal(isOpen);
  return (
    <div className={styles.explainBox}>
      <button
        type="button"
        aria-expanded={isOpen}
        className={styles.explainToggle}
        onClick={() => {
          setIsOpen((open) => !open);
        }}
      >
        <Icon name={isOpen ? "expand_less" : "expand_more"} size="sm" />
        {t(`explain.toggle.${target.subject}`)}
      </button>
      {isOpen && <ExplanationBody target={target} />}
    </div>
  );
}
