import type { FactResult } from "../../services/engine/factTypes";
import type { AlertResult } from "../../services/engine/reviewTypes";
import { alertSides } from "../alerts/alertSides";

/** Los datos confirmados del expediente que siguen vigentes (los retirados no cuentan). */
export function activeFacts(facts: readonly FactResult[]): FactResult[] {
  return facts.filter((fact) => fact.retiredAt === null);
}

function mentions(alert: AlertResult, fact: FactResult): boolean {
  return alertSides(alert).some(
    (side) => side.value === fact.value || side.normalizedValue === fact.value,
  );
}

/**
 * El dato confirmado que sirve de referencia para una inconsistencia: el que dice uno de sus
 * valores o, si no, el único del mismo tipo. Con varios posibles no se adivina cuál es.
 */
export function confirmedFactFor(
  alert: AlertResult,
  facts: readonly FactResult[],
): FactResult | undefined {
  const sameType = facts.filter((fact) => fact.entityType === alert.entityType);
  return sameType.find((fact) => mentions(alert, fact)) ?? onlyOne(sameType);
}

function onlyOne<Item>(items: readonly Item[]): Item | undefined {
  return items.length === 1 ? items[0] : undefined;
}
