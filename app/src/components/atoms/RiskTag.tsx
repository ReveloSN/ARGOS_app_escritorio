import { useI18n } from "../../i18n/i18nContext";
import { joinClassNames } from "../joinClassNames";
import { Icon } from "./Icon";
import { RISK_APPEARANCE, type RiskLevel } from "./riskAppearance";
import styles from "./Tag.module.css";

export type { RiskLevel } from "./riskAppearance";

interface RiskTagProps {
  readonly level: RiskLevel;
  readonly variant?: "short" | "long";
  readonly compact?: boolean;
}

export function RiskTag({ level, variant = "short", compact = false }: RiskTagProps) {
  const { t } = useI18n();
  const appearance = RISK_APPEARANCE[level];
  const label = variant === "long" ? appearance.longLabel : appearance.shortLabel;

  return (
    <span className={joinClassNames(styles.tag, styles[level], compact && styles.compact)}>
      <Icon name={appearance.icon} size="xs" />
      {t(label)}
    </span>
  );
}
