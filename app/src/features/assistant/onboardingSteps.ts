import type { EyeState } from "../../components/atoms/eyeShapes";
import type { TranslationKey } from "../../i18n/translate";

export interface OnboardingStep {
  readonly eye: EyeState;
  readonly say: TranslationKey;
  readonly title: TranslationKey;
  readonly body: TranslationKey;
  readonly points: readonly TranslationKey[];
}

/** Primeros pasos del mockup de Inicio: cargar, confirmar y decidir. */
export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  {
    eye: "reading",
    say: "assistant.onboarding.load.say",
    title: "assistant.onboarding.load.title",
    body: "assistant.onboarding.load.body",
    points: ["assistant.onboarding.load.local", "assistant.onboarding.load.addMore"],
  },
  {
    eye: "doubt",
    say: "assistant.onboarding.confirm.say",
    title: "assistant.onboarding.confirm.title",
    body: "assistant.onboarding.confirm.body",
    points: ["assistant.onboarding.confirm.reused", "assistant.onboarding.confirm.editable"],
  },
  {
    eye: "explaining",
    say: "assistant.onboarding.decide.say",
    title: "assistant.onboarding.decide.title",
    body: "assistant.onboarding.decide.body",
    points: ["assistant.onboarding.decide.shortcuts", "assistant.onboarding.decide.hide"],
  },
];
