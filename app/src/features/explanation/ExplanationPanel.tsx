import { useEffect, useState, type ReactNode } from "react";

import { useI18n } from "../../i18n/i18nContext";
import { useAssistantSignals } from "../assistant/assistantContext";
import { useEngineServices } from "../engine/EngineServicesContext";
import { useEngineQuery } from "../engine/useEngineQuery";
import { DetailBody, DetailToggle } from "./ExplanationDetail";
import { explanationKey, requestExplanation, type ExplainTarget } from "./explainTarget";
import { withAiStructure } from "./explanationBlocks";
import { PanelLayout } from "./PanelLayout";

/** Mientras el motor prepara la explicación, la barra lateral dice «Explicando un cambio». */
function useExplainingSignal(isWorking: boolean) {
  const { setExplaining } = useAssistantSignals();
  useEffect(() => {
    if (!isWorking) return undefined;
    setExplaining(true);
    return () => {
      setExplaining(false);
    };
  }, [isWorking, setExplaining]);
}

/** La explicación del texto largo se pide solo con «Ver detalle»: es lo único que puede salir al proveedor de IA. */
function useDetailQuery(target: ExplainTarget, isOpen: boolean) {
  const { locale } = useI18n();
  const { ai } = useEngineServices();
  const key = `${explanationKey(target, locale)}:${String(isOpen)}`;
  return useEngineQuery(key, () =>
    isOpen ? requestExplanation(ai, target, locale) : Promise.resolve(null),
  );
}

interface ExplanationPanelProps {
  readonly target: ExplainTarget;
  /** Es correcto / Es un error / Ignorar: van debajo de la explicación. */
  readonly actions: ReactNode;
}

/**
 * Explicación de un cambio o de una alerta que se entiende en cinco segundos: frase resumen,
 * los dos valores, tres bloques y las decisiones. La plantilla local se ve al instante; con IA
 * activada y «Ver detalle», sus bloques la reemplazan como «Sugerencia de IA».
 */
export function ExplanationPanel({ target, actions }: ExplanationPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const query = useDetailQuery(target, isOpen);
  useExplainingSignal(isOpen && query.state.status === "loading");
  const result = query.state.status === "ready" ? query.state.data : null;
  return (
    <PanelLayout
      blocks={withAiStructure(target.blocks, result?.structure ?? null)}
      meaning={target.meaning}
      values={target.values}
      isAiSuggestion={result?.source === "ai"}
      actions={actions}
      detail={
        <>
          <DetailToggle
            isOpen={isOpen}
            onToggle={() => {
              setIsOpen((open) => !open);
            }}
          />
          {isOpen && (
            <DetailBody state={query.state} quotes={target.quotes} onRetry={query.reload} />
          )}
        </>
      }
    />
  );
}
