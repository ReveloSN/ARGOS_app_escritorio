import type { TranslationKey } from "../../i18n/translate";

export type DecisionChoice = "correct" | "error" | "ignored";

export interface ChoiceAppearance {
  readonly choice: DecisionChoice;
  readonly icon: string;
  readonly label: TranslationKey;
  readonly description: TranslationKey;
  readonly shortcut: string;
}

// Los atajos C, E e I de los mockups no se traducen: son las teclas que se presionan.
export const DECISION_CHOICES: readonly ChoiceAppearance[] = [
  {
    choice: "correct",
    icon: "check",
    label: "decision.correct",
    description: "decisionPanel.correctDescription",
    shortcut: "C",
  },
  {
    choice: "error",
    icon: "edit_note",
    label: "decision.error",
    description: "decisionPanel.errorDescription",
    shortcut: "E",
  },
  {
    choice: "ignored",
    icon: "visibility_off",
    label: "decisionPanel.ignore",
    description: "decisionPanel.ignoreDescription",
    shortcut: "I",
  },
];
