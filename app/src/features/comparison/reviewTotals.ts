import type { ChangeResult } from "../../services/engine/comparisonTypes";
import type { DecisionKindValue, DecisionResult } from "../../services/engine/reviewTypes";

export type DecisionTotals = Readonly<Record<DecisionKindValue, number>>;

/** Cuántos de estos cambios se marcaron como error, como correctos o se ignoraron. */
export function decisionTotals(
  changes: readonly ChangeResult[],
  decisions: readonly DecisionResult[],
): DecisionTotals {
  const totals = { error: 0, correct: 0, ignored: 0 };
  for (const change of changes) {
    const decision = decisions.find((item) => item.alertNumber === change.number);
    if (decision) totals[decision.kind] += 1;
  }
  return totals;
}
