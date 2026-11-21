import type { ReactNode } from "react";

import { useI18n } from "../../i18n/i18nContext";
import type { TranslationKey } from "../../i18n/translate";
import { Icon } from "../atoms/Icon";
import { ProgressBar } from "../atoms/ProgressBar";
import { DECISION_CHOICES, type DecisionChoice } from "../molecules/decisionChoices";
import { joinClassNames } from "../joinClassNames";
import styles from "./DecisionPanel.module.css";

export type { DecisionChoice };
export type ValueSide = "first" | "second";

interface DecisionPanelProps {
  readonly current: DecisionChoice | undefined;
  readonly correctSide: ValueSide | undefined;
  /** Sin Valor B (verificación de un solo dato) no se pregunta cuál es el correcto. */
  readonly values: { readonly first: string; readonly second: string | undefined };
  /** «Se agregará a correcciones: cambiar…», o la indicación de que es opcional. */
  readonly correctionHint: string;
  readonly onDecide: (choice: DecisionChoice) => void;
  readonly onChooseCorrect: (side: ValueSide) => void;
  /** Cuántas van decididas en la revisión: lo que falta se ve junto a las opciones. */
  readonly progress?: { readonly decided: number; readonly total: number } | undefined;
  /** La confirmación de la última decisión con «Deshacer», dentro del bloque y no flotando. */
  readonly feedback?: ReactNode;
}

/** «¿Cómo quiere continuar?»: las tres decisiones del detalle, con sus atajos visibles. */
export function DecisionPanel(props: DecisionPanelProps) {
  const { t } = useI18n();
  return (
    <section aria-label={t("decisionPanel.title")} className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>{t("decisionPanel.title")}</h2>
        <span className={styles.hint}>{t("decisionPanel.undoHint")}</span>
        {props.progress && <DecisionProgress {...props.progress} />}
      </div>
      {props.feedback}
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
            {props.current === item.choice && (
              <span className={styles.chosen}>
                <Icon name="check_circle" size="sm" />
                {t("decisionPanel.chosen")}
              </span>
            )}
            <span className={styles.description}>{t(item.description)}</span>
          </button>
        ))}
      </div>
      {props.current === "error" && props.values.second !== undefined && (
        <CorrectValueChooser {...props} />
      )}
    </section>
  );
}

/** «3 de 80 decididas · 77 pendientes», con la barra: lo que falta revisar. */
function DecisionProgress({
  decided,
  total,
}: {
  readonly decided: number;
  readonly total: number;
}) {
  const { t } = useI18n();
  const text = t("decisionPanel.progress", { decided, total, pending: total - decided });
  return (
    <span className={styles.progress}>
      <span>{text}</span>
      <ProgressBar value={total > 0 ? decided / total : 0} label={text} />
    </span>
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
