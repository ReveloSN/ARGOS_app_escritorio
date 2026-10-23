import { useState } from "react";

import { ArgusEye } from "../../components/atoms/ArgusEye";
import { Icon } from "../../components/atoms/Icon";
import { useI18n } from "../../i18n/i18nContext";
import type { ChangeExplanationResult } from "../../services/engine/aiTypes";
import { explanationText } from "../alerts/explanationText";
import { useEngineServices } from "../engine/EngineServicesContext";
import { useEngineQuery } from "../engine/useEngineQuery";
import styles from "./Compare.module.css";

/** Qué se explica: el cambio de la comparación y el fragmento que se cita como origen. */
export interface ExplainTarget {
  readonly comparisonId: string;
  readonly number: number;
  readonly quote: string;
  readonly source: string;
}

function Explanation({
  result,
  target,
}: {
  result: ChangeExplanationResult;
  target: ExplainTarget;
}) {
  const i18n = useI18n();
  const { t } = i18n;
  const isAi = result.source === "ai";
  return (
    <div className={styles.explanation}>
      <span className={styles.explanationLabel}>
        {isAi ? t("comparison.explain.aiLabel") : t("comparison.explain.templateLabel")}
      </span>
      <span>{isAi ? result.text : explanationText(result.parts, i18n)}</span>
      <blockquote className={styles.quote}>
        <span>{target.quote}</span>
        <span className={styles.quoteSource}>{target.source}</span>
      </blockquote>
      {result.fallbackReason && (
        <span className={styles.explanationNote}>
          {t(`comparison.explain.fallback.${result.fallbackReason}`)}
        </span>
      )}
    </div>
  );
}

function ExplanationBody({ target }: { target: ExplainTarget }) {
  const { t, locale } = useI18n();
  const { ai } = useEngineServices();
  const key = `explain:${target.comparisonId}:${String(target.number)}:${locale}`;
  const query = useEngineQuery(key, () =>
    ai.explainChange(target.comparisonId, target.number, locale),
  );
  if (query.state.status === "ready")
    return <Explanation result={query.state.data} target={target} />;
  return (
    <div role="status" className={styles.explaining}>
      <ArgusEye state={query.state.status === "failed" ? "error" : "explaining"} size="sm" />
      {query.state.status === "failed"
        ? t("comparison.explain.failed")
        : t("comparison.explain.loading")}
    </div>
  );
}

/** «Explicar este cambio»: se pide al abrirlo; plantilla local o «Sugerencia de IA» citada. */
export function ChangeExplanationPanel({ target }: { target: ExplainTarget }) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
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
        {t("comparison.explain.toggle")}
      </button>
      {isOpen && <ExplanationBody target={target} />}
    </div>
  );
}
