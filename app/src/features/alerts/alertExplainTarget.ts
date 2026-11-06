import type { I18n } from "../../i18n/i18nContext";
import type { AlertResult, AlertSideResult } from "../../services/engine/reviewTypes";
import type { ExplanationBlocks } from "../explanation/explanationBlocks";
import type { ExplainQuote, ExplainTarget } from "../explanation/explainTarget";
import { alertTitle, describeLocation, type Translate } from "./alertPresentation";
import { alertSides } from "./alertSides";
import { describeDifference } from "./differenceDescription";
import { explanationText } from "./explanationText";

function quoteOf(side: AlertSideResult, t: Translate): ExplainQuote | undefined {
  const [origin] = side.occurrences;
  if (!origin) return undefined;
  return {
    text: origin.excerpt,
    source: `${origin.document} · ${describeLocation(origin.location, t)}`,
  };
}

/**
 * La plantilla local de una alerta en los cuatro bloques: el motor ya dice qué documentos
 * difieren (la frase resumen) y por qué (qué cambió); aquí se agrega por qué importa ese tipo
 * de dato y qué hacer.
 */
export function alertBlocks(alert: AlertResult, i18n: I18n): ExplanationBlocks {
  const [lead, ...rest] = alert.explanation;
  const leadSentence = lead ? explanationText([lead], i18n) : "";
  return {
    summary: leadSentence || alertTitle(alert, i18n.t),
    changed: explanationText(rest, i18n) || describeDifference(alert, i18n).description,
    why: i18n.t(`explainPanel.alert.why.${alert.entityType}`),
    todo: i18n.t(alert.second ? "explainPanel.alert.todo.pair" : "explainPanel.alert.todo.single"),
  };
}

/** «Ver detalle» de una alerta: cada valor se cita con el fragmento, el archivo y la página de origen. */
export function alertExplainTarget(
  sessionId: string,
  alert: AlertResult,
  i18n: I18n,
): ExplainTarget {
  const quotes = alertSides(alert)
    .map((side) => quoteOf(side, i18n.t))
    .filter((quote): quote is ExplainQuote => quote !== undefined);
  return {
    subject: "alert",
    sessionId,
    number: alert.number,
    quotes,
    blocks: alertBlocks(alert, i18n),
  };
}
