import { useI18n } from "../../i18n/i18nContext";
import { Icon } from "../atoms/Icon";
import { joinClassNames } from "../joinClassNames";
import styles from "./DecisionButtons.module.css";
import { DECISION_CHOICES, type DecisionChoice } from "./decisionChoices";

interface DecisionButtonsProps {
  readonly current: DecisionChoice | undefined;
  /** La decisión más probable se resalta sin moverla: el orden C E I no cambia nunca. */
  readonly emphasis?: DecisionChoice | undefined;
  /** Sobre qué se decide («Sobre este cambio»): se ve encima de los botones. */
  readonly subject?: string | undefined;
  readonly onDecide: (choice: DecisionChoice) => void;
}

/**
 * «Es correcto», «Es un error» e «Ignorar» en una fila compacta, con su tecla (C, E, I).
 * «Ignorar» pesa menos que las otras dos: es la decisión de no decidir.
 */
export function DecisionButtons({ current, emphasis, subject, onDecide }: DecisionButtonsProps) {
  const { t } = useI18n();
  return (
    <div role="group" aria-label={subject ?? t("decisionPanel.title")} className={styles.group}>
      {subject && <span className={styles.subject}>{subject}</span>}
      {DECISION_CHOICES.map((item) => (
        <button
          key={item.choice}
          type="button"
          title={t(item.description)}
          aria-pressed={current === item.choice}
          className={joinClassNames(
            styles.button,
            item.choice === "ignored" && styles.tertiary,
            item.choice === emphasis && styles.emphasized,
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
