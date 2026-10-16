import { MODIFIER_KEY } from "../../components/atoms/Kbd";
import type { DecisionKindValue } from "../../services/engine/reviewTypes";
import { useShortcuts, type Shortcut } from "../keyboard/useShortcuts";
import type { AlertDecisions } from "./useAlertDecisions";

export const UNDO_KEYS = [MODIFIER_KEY, "Z"];

const DECISION_KEYS: readonly { readonly key: string; readonly kind: DecisionKindValue }[] = [
  { key: "c", kind: "correct" },
  { key: "e", kind: "error" },
  { key: "i", kind: "ignored" },
];

interface DecisionShortcutsOptions {
  /** La alerta sobre la que deciden C, E e I; sin ella esas teclas no hacen nada. */
  readonly alertNumber: number | undefined;
  readonly decisions: AlertDecisions;
  readonly onNext: () => void;
  readonly onPrevious: () => void;
  readonly extra?: readonly Shortcut[];
}

/** J / K para moverse, C / E / I para decidir y Ctrl Z para deshacer (mockups). */
export function useDecisionShortcuts(options: DecisionShortcutsOptions): void {
  useShortcuts([
    { key: "j", run: options.onNext },
    { key: "k", run: options.onPrevious },
    ...decideShortcuts(options),
    undoShortcut(options.decisions),
    ...(options.extra ?? []),
  ]);
}

function decideShortcuts({ alertNumber, decisions }: DecisionShortcutsOptions): Shortcut[] {
  return DECISION_KEYS.map(({ key, kind }) => ({
    key,
    run: () => {
      if (alertNumber !== undefined && !decisions.isReadOnly) {
        decisions.decide({ alertNumber, kind });
      }
    },
  }));
}

export function undoShortcut(decisions: AlertDecisions): Shortcut {
  return {
    key: "z",
    withModifier: true,
    run: () => {
      if (decisions.canUndo) decisions.undo();
    },
  };
}
