import { joinClassNames } from "../../components/joinClassNames";
import { useI18n } from "../../i18n/i18nContext";
import styles from "./Compare.module.css";
import type { DocumentChangeCounts } from "./comparisonScope";

interface DocumentFilterChipsProps {
  readonly documents: readonly DocumentChangeCounts[];
  readonly selected: string | undefined;
  readonly onSelect: (document: string | undefined) => void;
}

function total(counts: DocumentChangeCounts["counts"]): number {
  return counts.removed + counts.added + counts.modified + counts.moved;
}

/** «Contra todos»: la lista se puede reducir a los cambios contra un solo documento. */
export function DocumentFilterChips({ documents, selected, onSelect }: DocumentFilterChipsProps) {
  const { t } = useI18n();
  const all = documents.reduce((sum, item) => sum + total(item.counts), 0);
  const chips = [
    { key: undefined, label: t("comparison.scope.allDocuments"), count: all },
    ...documents.map((item) => ({
      key: item.document,
      label: item.document,
      count: total(item.counts),
    })),
  ];
  return (
    <div role="group" aria-label={t("comparison.scope.filterLabel")} className={styles.chips}>
      {chips.map((chip) => (
        <button
          key={chip.key ?? "all"}
          type="button"
          title={chip.label}
          aria-pressed={selected === chip.key}
          className={joinClassNames(styles.chip, selected === chip.key && styles.chipActive)}
          onClick={() => {
            onSelect(chip.key);
          }}
        >
          <span className={styles.chipText}>{chip.label}</span> {chip.count}
        </button>
      ))}
    </div>
  );
}
