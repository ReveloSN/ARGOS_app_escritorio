import { useI18n } from "../../i18n/i18nContext";
import styles from "./Compare.module.css";
import type { DecisionTotals } from "./reviewTotals";

/** El cierre de la revisión: qué se decidió y, a la vista, que ya se puede exportar el informe. */
export function ReviewComplete({ totals }: { readonly totals: DecisionTotals }) {
  const { t, tPlural } = useI18n();
  const parts = [
    totals.error > 0 && tPlural({ key: "comparison.list.totals.error", count: totals.error }),
    totals.correct > 0 && tPlural({ key: "comparison.list.totals.correct", count: totals.correct }),
    totals.ignored > 0 && tPlural({ key: "comparison.list.totals.ignored", count: totals.ignored }),
  ].filter(Boolean);
  return (
    <p role="status" className={styles.reviewComplete}>
      {t("comparison.list.completeNote", { summary: parts.join(", ") })}
    </p>
  );
}
