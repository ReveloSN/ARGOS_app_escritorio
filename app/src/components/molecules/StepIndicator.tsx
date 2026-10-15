import { useI18n } from "../../i18n/i18nContext";
import { Icon } from "../atoms/Icon";
import { joinClassNames } from "../joinClassNames";
import styles from "./StepIndicator.module.css";

interface StepIndicatorProps {
  readonly steps: readonly string[];
  readonly currentIndex: number;
}

/** Navegación secuencial del wizard: pasos completados, actual y pendientes. */
export function StepIndicator({ steps, currentIndex }: StepIndicatorProps) {
  const { t } = useI18n();

  return (
    <ol aria-label={t("navigationAids.steps")} className={styles.steps}>
      {steps.map((step, index) => {
        const status =
          index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming";
        return (
          <li
            key={step}
            aria-current={status === "current" ? "step" : undefined}
            className={joinClassNames(styles.step, styles[status])}
          >
            <span className={styles.marker}>
              {status === "done" ? <Icon name="check" size="xs" /> : index + 1}
            </span>
            {step}
          </li>
        );
      })}
    </ol>
  );
}
