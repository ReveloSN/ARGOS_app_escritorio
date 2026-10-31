import type { ComparisonResult } from "../../services/engine/comparisonTypes";
import type { AlertDecisions } from "../alerts/useAlertDecisions";
import { useDecisionShortcuts } from "../alerts/useDecisionShortcuts";
import { COMPARE_TABS } from "./compareTabs";
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

/** Decidir lleva al siguiente cambio de la lista; la decisión tomada queda marcada en su fila. */
function advancingAfterDecision(saved: AlertDecisions, advance: () => void): AlertDecisions {
  return {
    ...saved,
    decide: (input) => {
      saved.decide(input);
      advance();
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
  const step = stepper(navigableNumbers(comparison, view, list), view);
  const decisions = advancingAfterDecision(useComparisonDecisions(), step(1));
  useDecisionShortcuts({
    alertNumber: view.tab === "matrix" ? undefined : view.selected,
    decisions,
    onNext: step(1),
    onPrevious: step(-1),
    extra: tabShortcuts(view),
  });
  return decisions;
}
