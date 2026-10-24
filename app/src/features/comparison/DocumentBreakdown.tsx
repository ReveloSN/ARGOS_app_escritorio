import { useI18n } from "../../i18n/i18nContext";
import type { PluralKey } from "../../i18n/translate";
import type { ChangeKindValue } from "../../services/engine/comparisonTypes";
import { CHANGE_KINDS } from "./changeFilters";
import styles from "./Compare.module.css";
import type { DocumentChangeCounts } from "./comparisonScope";

const COUNTER_LABELS: Readonly<Record<ChangeKindValue, PluralKey>> = {
  removed: "comparison.counters.removed",
  added: "comparison.counters.added",
  modified: "comparison.counters.modified",
  moved: "comparison.counters.moved",
};

/** El resumen numérico desglosado: cuántos cambios de cada tipo hay contra cada documento. */
export function DocumentBreakdown({
  documents,
}: {
  readonly documents: readonly DocumentChangeCounts[];
}) {
  const { t, tPlural } = useI18n();
  return (
    <table className={styles.breakdown}>
      <caption className={styles.breakdownTitle}>{t("comparison.scope.breakdown")}</caption>
      <tbody>
        {documents.map((item) => {
          const parts = CHANGE_KINDS.filter((kind) => item.counts[kind] > 0).map(
            (kind) =>
              `${String(item.counts[kind])} ${tPlural({ key: COUNTER_LABELS[kind], count: item.counts[kind] })}`,
          );
          return (
            <tr key={item.document}>
              <th scope="row" title={item.document} className={styles.breakdownDocument}>
                {item.document}
              </th>
              <td>{parts.length ? parts.join(" · ") : t("comparison.scope.noChanges")}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
