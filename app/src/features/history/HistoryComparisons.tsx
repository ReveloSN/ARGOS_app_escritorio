import { Button } from "../../components/atoms/Button";
import { ErrorMessage } from "../../components/molecules/ErrorMessage";
import { useI18n } from "../../i18n/i18nContext";
import type { HistoryComparisonResult } from "../../services/engine/historyTypes";
import styles from "./HistoryPage.module.css";

interface HistoryComparisonsProps {
  readonly comparisons: readonly HistoryComparisonResult[];
  readonly onOpen: (id: string) => void;
  /** La comparación que no se pudo abrir: se explica sobre la lista, con un botón para reintentar. */
  readonly failedId: string | undefined;
}

/** Las comparaciones del periodo; cada una se reabre con sus decisiones. Sin ninguna, no se muestra. */
export function HistoryComparisons({ comparisons, onOpen, failedId }: HistoryComparisonsProps) {
  const { t, tPlural, format } = useI18n();
  if (comparisons.length === 0) return null;
  return (
    <section aria-labelledby="history-comparisons" className={styles.comparisons}>
      <h2 id="history-comparisons" className={styles.comparisonsTitle}>
        {t("history.comparisons.title")}
      </h2>
      {failedId !== undefined && (
        <ErrorMessage
          tone="inline"
          what={t("history.comparisons.failed.what")}
          why={t("history.comparisons.failed.why")}
          todo={t("history.comparisons.failed.todo")}
          primaryAction={{
            label: t("history.retry"),
            onClick: () => {
              onOpen(failedId);
            },
          }}
        />
      )}
      <ul aria-label={t("history.comparisons.listLabel")} className={styles.comparisonList}>
        {comparisons.map((item) => (
          <li key={item.id} className={styles.comparisonRow}>
            <span className={styles.comparisonName} title={item.name}>
              {item.name}
            </span>
            <span className={styles.comparisonDate}>
              {format.dateTime(new Date(item.createdAt))}
            </span>
            <span className={styles.comparisonMeta}>
              {t("history.comparisons.summary", {
                documents: tPlural({
                  key: "history.comparisons.documents",
                  count: item.documentCount,
                }),
                decided: item.decidedCount,
                total: item.itemCount,
              })}
            </span>
            <Button
              size="md"
              ariaLabel={t("history.comparisons.openLabel", { name: item.name })}
              onClick={() => {
                onOpen(item.id);
              }}
            >
              {t("history.comparisons.open")}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
