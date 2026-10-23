import { useI18n } from "../../i18n/i18nContext";
import type { TranslationKey } from "../../i18n/translate";
import { Icon } from "../atoms/Icon";
import { DECISION_CHOICES, type DecisionChoice } from "../molecules/decisionChoices";
import { joinClassNames } from "../joinClassNames";
import styles from "./DecisionPanel.module.css";

export type { DecisionChoice };
export type ValueSide = "first" | "second";

interface DecisionPanelProps {
  readonly current: DecisionChoice | undefined;
  readonly correctSide: ValueSide | undefined;
  readonly values: Readonly<Record<ValueSide, string>>;
  /** «Se agregará a correcciones: cambiar…», o la indicación de que es opcional. */
  readonly correctionHint: string;
  readonly onDecide: (choice: DecisionChoice) => void;
  readonly onChooseCorrect: (side: ValueSide) => void;
}

/** «¿Cómo quiere continuar?»: las tres decisiones del detalle, con sus atajos visibles. */
export function DecisionPanel(props: DecisionPanelProps) {
  const { t } = useI18n();
  return (
    <section aria-label={t("decisionPanel.title")} className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>{t("decisionPanel.title")}</h2>
        <span className={styles.hint}>{t("decisionPanel.undoHint")}</span>
      </div>
      <div className={styles.choices}>
        {DECISION_CHOICES.map((item) => (
          <button
            key={item.choice}
            type="button"
            aria-pressed={props.current === item.choice}
            className={joinClassNames(
              styles.choice,
              styles[item.choice],
              props.current === item.choice && styles.selected,
            )}
            onClick={() => {
              props.onDecide(item.choice);
            }}
          >
            <span className={styles.choiceTitle}>
              <Icon name={item.icon} size="md" />
              <span className={styles.grow}>{t(item.label)}</span>
              <kbd className={styles.key}>{item.shortcut}</kbd>
            </span>
            <span className={styles.description}>{t(item.description)}</span>
          </button>
        ))}
      </div>
      {props.current === "error" && <CorrectValueChooser {...props} />}
    </section>
  );
}

function CorrectValueChooser({
  correctSide,
  values,
  correctionHint,
  onChooseCorrect,
}: DecisionPanelProps) {
  const { t } = useI18n();
  const sides: readonly { side: ValueSide; label: TranslationKey }[] = [
    { side: "first", label: "alerts.valueA" },
    { side: "second", label: "alerts.valueB" },
  ];
  return (
    <div role="group" aria-label={t("decisionPanel.whichIsCorrect")} className={styles.chooser}>
      <span className={styles.question}>{t("decisionPanel.whichIsCorrect")}</span>
      {sides.map(({ side, label }) => (
        <button
          key={side}
          type="button"
          aria-pressed={correctSide === side}
          className={joinClassNames(styles.value, correctSide === side && styles.selected)}
          onClick={() => {
            onChooseCorrect(side);
          }}
        >
          <span className={styles.valueText}>{values[side]}</span>
          <span className={styles.valueLabel}>{t(label)}</span>
        </button>
      ))}
      <span className={styles.hint}>{correctionHint}</span>
    </div>
  );
}
