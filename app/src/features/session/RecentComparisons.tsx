import { useI18n } from "../../i18n/i18nContext";
import styles from "./SessionOverview.module.css";
import type { ComparisonDigest } from "./sessionSnapshot";

interface RecentComparisonsProps {
  readonly comparisons: readonly ComparisonDigest[];
  readonly onOpen: () => void;
}

export function RecentComparisons({ comparisons, onOpen }: RecentComparisonsProps) {
  const { t, tPlural } = useI18n();
  if (!comparisons.length) return null;
  return (
    <section className={styles.comparisons}>
      <h2 className={styles.subtitle}>{t("home.overview.comparisonsTitle")}</h2>
      <ul className={styles.list}>
        {comparisons.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              aria-label={t("home.overview.openComparison", { name: item.name })}
              className={styles.comparison}
              onClick={onOpen}
            >
              <span className={styles.comparisonName}>{item.name}</span>
              <span className={styles.comparisonMeta}>
                {tPlural({
                  key: "home.overview.comparison",
                  count: item.changeCount,
                  params: { documents: item.documentCount },
                })}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
