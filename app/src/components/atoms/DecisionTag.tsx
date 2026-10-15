import { useI18n } from "../../i18n/i18nContext";
import type { TranslationKey } from "../../i18n/translate";
import { joinClassNames } from "../joinClassNames";
import { Icon } from "./Icon";
import styles from "./Tag.module.css";

export type DecisionState = "pending" | "correct" | "error" | "ignored";

const DECISION_APPEARANCE: Readonly<
  Record<DecisionState, { readonly icon: string; readonly label: TranslationKey }>
> = {
  pending: { icon: "radio_button_unchecked", label: "decision.pending" },
  correct: { icon: "check", label: "decision.correct" },
  error: { icon: "edit_note", label: "decision.error" },
  ignored: { icon: "visibility_off", label: "decision.ignored" },
};

interface DecisionTagProps {
  readonly state: DecisionState;
}

// «Es un error» es la única etiqueta rellena e «Ignorada» usa borde punteado: no se confunden.
export function DecisionTag({ state }: DecisionTagProps) {
  const { t } = useI18n();
  const appearance = DECISION_APPEARANCE[state];

  return (
    <span className={joinClassNames(styles.tag, styles[state])}>
      <Icon name={appearance.icon} size="xs" />
      {t(appearance.label)}
    </span>
  );
}
