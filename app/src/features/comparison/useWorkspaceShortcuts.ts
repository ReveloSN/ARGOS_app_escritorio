import type { ComparisonResult } from "../../services/engine/comparisonTypes";
import type { AlertDecisions } from "../alerts/useAlertDecisions";
import { useDecisionShortcuts } from "../alerts/useDecisionShortcuts";
import { COMPARE_TABS } from "./compareTabs";
import { nextUndecided } from "./nextUndecided";
import type { ScopedList } from "./scopedList";
import { useComparisonDecisions } from "./useComparisonDecisions";
import type { ComparisonView } from "./useComparisonView";

/** Los números que recorren J y K en la pestaña actual. */
function navigableNumbers(
  comparison: ComparisonResult,
  view: ComparisonView,
  list: ScopedList,
): number[] {
  if (view.tab === "inconsistencies")
    return comparison.inconsistencies.map((alert) => alert.number);
  return list.visible.map((change) => change.number);
}

/** Mueve la selección `offset` lugares dentro de la lista, sin salirse de ella. */
function stepper(numbers: readonly number[], view: ComparisonView) {
  return (offset: number) => () => {
    const index = view.selected === undefined ? -1 : numbers.indexOf(view.selected);
    const next = numbers[Math.min(Math.max(index + offset, 0), numbers.length - 1)];
    if (next !== undefined) view.select(next);
  };
}

/** Tras decidir, el foco pasa a la fila del siguiente cambio: la decisión anterior ya quedó en su fila. */
function focusSelectedRow() {
  requestAnimationFrame(() => {
    document.querySelector<HTMLElement>("button[data-change-row][aria-current=true]")?.focus();
  });
}

interface Advance {
  readonly numbers: readonly number[];
  readonly decided: ReadonlySet<number>;
  readonly view: ComparisonView;
}

/** Decidir lleva al siguiente cambio SIN decidir; la decisión tomada queda marcada en su fila. */
function advancingAfterDecision(saved: AlertDecisions, advance: Advance): AlertDecisions {
  return {
    ...saved,
    decide: (input) => {
      saved.decide(input);
      const decided = new Set([...advance.decided, input.alertNumber]);
      const next = nextUndecided(advance.numbers, decided, input.alertNumber);
      if (next !== undefined) advance.view.select(next);
      focusSelectedRow();
    },
  };
}

function tabShortcuts(view: ComparisonView) {
  return COMPARE_TABS.map((item) => ({
    key: item.key,
    run: () => {
      view.setTab(item.tab);
    },
  }));
}

/** J K, C E I, Ctrl Z y las teclas 1 2 3 de las pestañas; devuelve las decisiones. */
export function useWorkspaceShortcuts(
  comparison: ComparisonResult,
  view: ComparisonView,
  list: ScopedList,
): AlertDecisions {
  const numbers = navigableNumbers(comparison, view, list);
  const step = stepper(numbers, view);
  const decided = new Set(comparison.decisions.decisions.map((decision) => decision.alertNumber));
  const decisions = advancingAfterDecision(useComparisonDecisions(), { numbers, decided, view });
  useDecisionShortcuts({
    alertNumber: view.tab === "matrix" ? undefined : view.selected,
    decisions,
    onNext: step(1),
    onPrevious: step(-1),
    extra: tabShortcuts(view),
  });
  return decisions;
}
