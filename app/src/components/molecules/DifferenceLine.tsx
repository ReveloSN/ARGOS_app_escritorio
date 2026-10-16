import { useI18n } from "../../i18n/i18nContext";
import { Icon } from "../atoms/Icon";
import styles from "./DifferenceLine.module.css";

interface DifferenceLineProps {
  /** Qué cambia, ya traducido: «Diferencia: posiciones 2 y 3 intercambiadas». */
  readonly description: string;
  /** Los caracteres que cambian, en monoespaciada: «8 ↔ 5». */
  readonly change?: string | undefined;
  /** Si los caracteres distintos están resaltados en los valores de arriba. */
  readonly isHighlighted: boolean;
}

export function DifferenceLine({ description, change, isHighlighted }: DifferenceLineProps) {
  const { t } = useI18n();
  return (
    <p className={styles.line}>
      <Icon name="difference" size="sm" />
      <span>{description}</span>
      {change && <span className={styles.change}>{change}</span>}
      {isHighlighted && <span className={styles.note}>{t("difference.highlightNote")}</span>}
    </p>
  );
}
