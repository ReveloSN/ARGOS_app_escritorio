import { useI18n } from "../../i18n/i18nContext";
import { RiskTag, type RiskLevel } from "../atoms/RiskTag";
import { joinClassNames } from "../joinClassNames";
import styles from "./CompactAlertList.module.css";

export interface CompactAlertItem {
  readonly number: number;
  readonly risk: RiskLevel;
  readonly title: string;
  /** Ambos valores en una línea: «4857 · 4587». */
  readonly values: string;
  /** Estado ya traducido: «Pendiente», «Es correcto»… */
  readonly state: string;
  readonly isPending: boolean;
}

interface CompactAlertListProps {
  readonly summary: string;
  readonly items: readonly CompactAlertItem[];
  readonly currentNumber: number;
  readonly onSelect: (number: number) => void;
}

/** Lista lateral del detalle: todas las alertas de la sesión, la actual marcada. */
export function CompactAlertList({
  summary,
  items,
  currentNumber,
  onSelect,
}: CompactAlertListProps) {
  const { t } = useI18n();
  return (
    <nav aria-label={t("alerts.listLabel")} className={styles.container}>
      <div className={styles.header}>
        <span className={styles.summary}>{summary}</span>
        <span className={styles.keys}>{t("alertDetail.navigationKeys")}</span>
      </div>
      <ol className={styles.list}>
        {items.map((item) => (
          <li key={item.number}>
            <button
              type="button"
              aria-current={item.number === currentNumber ? "true" : undefined}
              className={joinClassNames(
                styles.item,
                item.number === currentNumber && styles.current,
              )}
              onClick={() => {
                onSelect(item.number);
              }}
            >
              <RiskTag level={item.risk} compact />
              <span className={styles.title}>{item.title}</span>
              <span className={styles.number}>{`#${String(item.number)}`}</span>
              <span className={styles.values}>{item.values}</span>
              <span />
              <span className={joinClassNames(styles.state, item.isPending && styles.pending)}>
                {item.state}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
