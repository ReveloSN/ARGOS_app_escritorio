import type { AiGateway, ChangeExplanationResult } from "../../services/engine/aiTypes";
import type { ExplanationBlocks } from "./explanationBlocks";
import type { SideBySide } from "./sideValues";

/** Un fragmento de origen que se cita junto a la explicación: archivo y página incluidos. */
export interface ExplainQuote {
  readonly text: string;
  readonly source: string;
}

/** Qué se explica: un cambio de una comparación o una alerta de una revisión. */
export type ExplainSubject =
  | { readonly subject: "change"; readonly comparisonId: string; readonly number: number }
  | { readonly subject: "alert"; readonly sessionId: string; readonly number: number };

export type ExplainTarget = ExplainSubject & {
  readonly quotes: readonly ExplainQuote[];
  /** La explicación local, lista al instante: plantilla de respaldo, sin clave ni conexión. */
  readonly blocks: ExplanationBlocks;
  /** La sugerencia de significado de la IA local, ya en lenguaje claro. */
  readonly meaning?: string | undefined;
  /** Los dos valores lado a lado; las alertas ya los muestran arriba y no lo repiten. */
  readonly values?: SideBySide | undefined;
};

function idOf(target: ExplainSubject): string {
  return target.subject === "change" ? target.comparisonId : target.sessionId;
}

/** Una consulta por elemento e idioma: cambiar de idioma vuelve a pedir la explicación. */
export function explanationKey(target: ExplainSubject, locale: string): string {
  return `explain:${target.subject}:${idOf(target)}:${String(target.number)}:${locale}`;
}

/** El mismo flujo para los dos: misma IA opcional, misma clave y mismo consentimiento. */
export function requestExplanation(
  ai: AiGateway,
  target: ExplainSubject,
  locale: string,
): Promise<ChangeExplanationResult> {
  if (target.subject === "change") {
    return ai.explainChange(target.comparisonId, target.number, locale);
  }
  return ai.explainAlert(target.sessionId, target.number, locale);
}
