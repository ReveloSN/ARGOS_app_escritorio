import { useI18n } from "../../i18n/i18nContext";
import type { ChangeResult } from "../../services/engine/comparisonTypes";
import styles from "./Compare.module.css";

/** Solo el riesgo alto lleva marca: un punto rojo con su nombre, nunca solo color. */
export function RiskDot({ risk }: { readonly risk: ChangeResult["risk"] }) {
  const { t } = useI18n();
  if (risk !== "high") return <span aria-hidden="true" className={styles.riskDotSpace} />;
  return <span role="img" aria-label={t("risk.highLong")} className={styles.riskDot} />;
}
