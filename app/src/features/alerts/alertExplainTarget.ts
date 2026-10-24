import type { AlertResult, AlertSideResult } from "../../services/engine/reviewTypes";
import type { ExplainQuote, ExplainTarget } from "../explanation/explainTarget";
import { describeLocation, type Translate } from "./alertPresentation";
import { alertSides } from "./alertSides";

function quoteOf(side: AlertSideResult, t: Translate): ExplainQuote | undefined {
  const [origin] = side.occurrences;
  if (!origin) return undefined;
  return {
    text: origin.excerpt,
    source: `${origin.document} · ${describeLocation(origin.location, t)}`,
  };
}

/** «Explicar esta alerta»: cada valor se cita con el fragmento, el archivo y la página de origen. */
export function alertExplainTarget(
  sessionId: string,
  alert: AlertResult,
  t: Translate,
): ExplainTarget {
  const quotes = alertSides(alert)
    .map((side) => quoteOf(side, t))
    .filter((quote): quote is ExplainQuote => quote !== undefined);
  return { subject: "alert", sessionId, number: alert.number, quotes };
}
