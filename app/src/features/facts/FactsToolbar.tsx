import { joinClassNames } from "../../components/joinClassNames";
import { useI18n } from "../../i18n/i18nContext";
import { FACT_FILTERS, filterCounts, type FactFilter, type FactRow } from "./factRows";
import styles from "./Facts.module.css";

interface FactsToolbarProps {
  readonly rows: readonly FactRow[];
  readonly filter: FactFilter;
  readonly onFilter: (filter: FactFilter) => void;
}

/** Filtros del mockup: Todos, Con contradicciones y Sin confirmar, con su cantidad. */
export function FactsToolbar({ rows, filter, onFilter }: FactsToolbarProps) {
  const { t } = useI18n();
  const counts = filterCounts(rows);
  return (
    <div role="group" aria-label={t("facts.filtersLabel")} className={styles.filters}>
      {FACT_FILTERS.map((item) => (
        <button
          key={item}
          type="button"
          aria-pressed={filter === item}
          className={joinClassNames(styles.filter, filter === item && styles.filterActive)}
          onClick={() => {
            onFilter(item);
          }}
        >
          {t(`facts.filters.${item}`)}
          <span className={styles.count}>{counts[item]}</span>
        </button>
      ))}
    </div>
  );
}
