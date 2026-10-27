import type { ReactNode } from "react";

import { joinClassNames } from "../../components/joinClassNames";
import { useI18n } from "../../i18n/i18nContext";
import type { PluralKey } from "../../i18n/translate";
import type { ChangeKindValue, ChangeResult } from "../../services/engine/comparisonTypes";
import { CHANGE_KINDS, countByKind, type ChangeFilters } from "./changeFilters";
import styles from "./Compare.module.css";
import { ComparisonOptions } from "./ComparisonOptions";

const COUNTER_LABELS: Readonly<Record<ChangeKindValue, PluralKey>> = {
  removed: "comparison.counters.removed",
  added: "comparison.counters.added",
  modified: "comparison.counters.modified",
  moved: "comparison.counters.moved",
};

interface VersionsToolbarProps {
  /** Los cambios del alcance, después de ignorar los de forma. */
  readonly changes: readonly ChangeResult[];
  /** Qué se compara: A → B, o el documento base frente a todos. */
  readonly heading: ReactNode;
  readonly filters: ChangeFilters;
  readonly onFilters: (filters: ChangeFilters) => void;
}

/** Qué se compara y cuántos cambios hay de cada tipo; los filtros van plegados en «Opciones». */
export function VersionsToolbar({ changes, heading, filters, onFilters }: VersionsToolbarProps) {
  const { tPlural } = useI18n();
  const counts = countByKind(changes);
  return (
    <div className={styles.toolbar}>
      <div className={styles.documents}>{heading}</div>
      <div className={styles.counters}>
        {CHANGE_KINDS.map((kind) => (
          <span key={kind} className={styles.counter}>
            <span className={styles.counterValue}>{counts[kind]}</span>
            <span className={joinClassNames(styles.counterLabel, styles[kind])}>
              {tPlural({ key: COUNTER_LABELS[kind], count: counts[kind] })}
            </span>
          </span>
        ))}
      </div>
      <ComparisonOptions changes={changes} filters={filters} onFilters={onFilters} />
    </div>
  );
}
