import { useI18n } from "../../i18n/i18nContext";
import { Icon } from "../atoms/Icon";
import { joinClassNames } from "../joinClassNames";
import styles from "./DecisionButtons.module.css";
import { DECISION_CHOICES, type DecisionChoice } from "./decisionChoices";

interface DecisionButtonsProps {
  readonly current: DecisionChoice | undefined;
  /** La decisión más probable va primero (en un riesgo alto, «Es un error»). */
  readonly emphasis?: DecisionChoice | undefined;
  readonly onDecide: (choice: DecisionChoice) => void;
}

function orderedChoices(emphasis: DecisionChoice | undefined) {
  const first = DECISION_CHOICES.filter((item) => item.choice === emphasis);
  return [...first, ...DECISION_CHOICES.filter((item) => item.choice !== emphasis)];
}

/**
 * «Es correcto», «Es un error» e «Ignorar» en una fila compacta, con su tecla (C, E, I).
 * «Ignorar» pesa menos que las otras dos: es la decisión de no decidir.
 */
export function DecisionButtons({ current, emphasis, onDecide }: DecisionButtonsProps) {
  const { t } = useI18n();
  return (
    <div role="group" aria-label={t("decisionPanel.title")} className={styles.group}>
      {orderedChoices(emphasis).map((item) => (
        <button
          key={item.choice}
          type="button"
          title={t(item.description)}
          aria-pressed={current === item.choice}
          className={joinClassNames(
            styles.button,
            item.choice === "ignored" && styles.tertiary,
            current === item.choice && styles.selected,
          )}
          onClick={() => {
            onDecide(item.choice);
          }}
        >
          <Icon name={item.icon} size="sm" />
          <span className={styles.label}>{t(item.label)}</span>
          <kbd className={styles.key}>{item.shortcut}</kbd>
        </button>
      ))}
    </div>
  );
}
