import { useI18n } from "../../i18n/i18nContext";
import type { TranslationKey } from "../../i18n/translate";
import { Icon } from "../atoms/Icon";
import { DiffValue } from "../molecules/DiffValue";
import { SourceLine } from "../molecules/SourceLine";
import styles from "./ComparisonPanel.module.css";

export interface ComparedValue {
  readonly value: string;
  readonly positions: readonly number[];
  readonly fileName: string;
  /** Ubicación ya traducida («Página 1 · Encabezado»). */
  readonly location: string;
  /** Fragmento del documento donde aparece el valor. */
  readonly excerpt?: string | undefined;
  readonly occurrences: number;
  readonly files: number;
}

interface ComparisonPanelProps {
  readonly first: ComparedValue;
  readonly second: ComparedValue;
}

/** Valor A y Valor B lado a lado, cada uno con su origen (CLAUDE.md §7). */
export function ComparisonPanel({ first, second }: ComparisonPanelProps) {
  const { t } = useI18n();
  return (
    <div role="group" aria-label={t("alerts.compare")} className={styles.panel}>
      <ValueCard label="alerts.valueA" compared={first} />
      <span className={styles.arrow}>
        <Icon name="compare_arrows" size="lg" />
      </span>
      <ValueCard label="alerts.valueB" compared={second} />
    </div>
  );
}

function ValueCard({ label, compared }: { label: TranslationKey; compared: ComparedValue }) {
  const { t, tPlural } = useI18n();
  const occurrences = tPlural({ key: "alerts.occurrences", count: compared.occurrences });
  const files = tPlural({ key: "alerts.inFiles", count: compared.files });
  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardLabel}>{t(label)}</span>
        <span className={styles.cardMeta}>{`${occurrences} ${files}`}</span>
      </div>
      <div className={styles.cardBody}>
        <DiffValue value={compared.value} positions={compared.positions} />
        <SourceLine fileName={compared.fileName} location={compared.location} />
        {compared.excerpt && <blockquote className={styles.excerpt}>{compared.excerpt}</blockquote>}
      </div>
    </section>
  );
}
