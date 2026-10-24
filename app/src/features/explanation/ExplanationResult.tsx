import { ErrorMessage } from "../../components/molecules/ErrorMessage";
import { useI18n } from "../../i18n/i18nContext";
import type { ChangeExplanationResult, FallbackReasonValue } from "../../services/engine/aiTypes";
import { explanationText } from "../alerts/explanationText";
import type { ExplainQuote } from "./explainTarget";
import styles from "./ExplanationPanel.module.css";

interface ExplanationResultProps {
  readonly result: ChangeExplanationResult;
  readonly quotes: readonly ExplainQuote[];
  readonly onRetry: () => void;
}

/** Por qué se muestra la explicación local aunque la IA esté activada, en 3 partes. */
function FallbackNotice({ reason, onRetry }: { reason: FallbackReasonValue; onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <ErrorMessage
      tone="inline"
      what={t(`explain.fallback.${reason}.what`)}
      why={t(`explain.fallback.${reason}.why`)}
      todo={t(`explain.fallback.${reason}.todo`)}
      primaryAction={{ label: t("explain.retry"), onClick: onRetry }}
    />
  );
}

function Quotes({ quotes }: { quotes: readonly ExplainQuote[] }) {
  return (
    <>
      {quotes.map((quote) => (
        <blockquote key={quote.source} className={styles.quote}>
          <span>{quote.text}</span>
          <span className={styles.quoteSource}>{quote.source}</span>
        </blockquote>
      ))}
    </>
  );
}

/** Plantilla local o «Sugerencia de IA», siempre con la cita de su origen (CLAUDE.md §15). */
export function ExplanationResult({ result, quotes, onRetry }: ExplanationResultProps) {
  const i18n = useI18n();
  const { t } = i18n;
  const isAi = result.source === "ai";
  return (
    <div className={styles.explanation}>
      <span className={styles.explanationLabel}>
        {isAi ? t("explain.aiLabel") : t("explain.templateLabel")}
      </span>
      <span>{isAi ? result.text : explanationText(result.parts, i18n)}</span>
      <Quotes quotes={quotes} />
      {isAi && <span className={styles.explanationNote}>{t("explain.aiNote")}</span>}
      {result.fallbackReason && <FallbackNotice reason={result.fallbackReason} onRetry={onRetry} />}
    </div>
  );
}
