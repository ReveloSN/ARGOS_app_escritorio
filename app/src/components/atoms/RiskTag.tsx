import { useI18n } from "../../i18n/i18nContext";
import type { TranslationKey } from "../../i18n/translate";
import { joinClassNames } from "../joinClassNames";
import { Icon } from "./Icon";
import styles from "./Tag.module.css";

export type RiskLevel = "high" | "medium" | "low";

interface RiskAppearance {
  readonly icon: string;
  readonly shortLabel: TranslationKey;
  readonly longLabel: TranslationKey;
}

// Cada riesgo tiene icono de forma distinta además de color: nunca se comunica solo con color.
const RISK_APPEARANCE: Readonly<Record<RiskLevel, RiskAppearance>> = {
  high: { icon: "report", shortLabel: "risk.high", longLabel: "risk.highLong" },
  medium: { icon: "warning", shortLabel: "risk.medium", longLabel: "risk.mediumLong" },
  low: { icon: "info", shortLabel: "risk.low", longLabel: "risk.lowLong" },
};

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
