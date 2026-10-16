import type { TranslationKey } from "../../i18n/translate";

export type RiskLevel = "high" | "medium" | "low";

interface RiskAppearance {
  readonly icon: string;
  readonly shortLabel: TranslationKey;
  readonly longLabel: TranslationKey;
}

// Cada riesgo tiene icono de forma distinta además de color: nunca se comunica solo con color.
export const RISK_APPEARANCE: Readonly<Record<RiskLevel, RiskAppearance>> = {
  high: { icon: "report", shortLabel: "risk.high", longLabel: "risk.highLong" },
  medium: { icon: "warning", shortLabel: "risk.medium", longLabel: "risk.mediumLong" },
  low: { icon: "info", shortLabel: "risk.low", longLabel: "risk.lowLong" },
};
