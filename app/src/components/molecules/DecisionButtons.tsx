import { useI18n } from "../../i18n/i18nContext";
import { Icon } from "../atoms/Icon";
import { joinClassNames } from "../joinClassNames";
import styles from "./DecisionButtons.module.css";
import { DECISION_CHOICES, type DecisionChoice } from "./decisionChoices";

interface DecisionButtonsProps {
  readonly current: DecisionChoice | undefined;
  readonly onDecide: (choice: DecisionChoice) => void;
}

/** «Es correcto», «Es un error» e «Ignorar» en una fila compacta, con su tecla (C, E, I). */
export function DecisionButtons({ current, onDecide }: DecisionButtonsProps) {
  const { t } = useI18n();
  return (
    <div role="group" aria-label={t("decisionPanel.title")} className={styles.group}>
      {DECISION_CHOICES.map((item) => (
        <button
          key={item.choice}
          type="button"
          aria-pressed={current === item.choice}
          className={joinClassNames(styles.button, current === item.choice && styles.selected)}
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
