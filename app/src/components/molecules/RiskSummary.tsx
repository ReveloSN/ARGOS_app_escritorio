import { useI18n } from "../../i18n/i18nContext";
import { Icon } from "../atoms/Icon";
import { RISK_APPEARANCE, type RiskLevel } from "../atoms/riskAppearance";
import { joinClassNames } from "../joinClassNames";
import styles from "./RiskSummary.module.css";

const LEVELS: readonly RiskLevel[] = ["high", "medium", "low"];

interface RiskSummaryProps {
  readonly counts: Readonly<Record<RiskLevel, number>>;
}

/** Cuántas alertas hay de cada riesgo, con icono y etiqueta además del color. */
export function RiskSummary({ counts }: RiskSummaryProps) {
  const { t } = useI18n();
  return (
    <ul className={styles.summary}>
      {LEVELS.map((level) => (
        <li key={level} className={styles.level}>
          <Icon
            name={RISK_APPEARANCE[level].icon}
            size="sm"
            className={joinClassNames(styles.icon, styles[level])}
          />
          {t(RISK_APPEARANCE[level].shortLabel)}
          <span className={styles.count}>{counts[level]}</span>
        </li>
      ))}
    </ul>
  );
}
