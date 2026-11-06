import type { ReactNode } from "react";

import { useI18n } from "../../i18n/i18nContext";
import type { ChangeResult } from "../../services/engine/comparisonTypes";
import { importantCount } from "./changeFilters";
import styles from "./Compare.module.css";
import { ComparisonOptions } from "./ComparisonOptions";
import type { OptionsPanelProps } from "./OptionsPanel";

interface VersionsToolbarProps {
  /** Qué se compara: A → B, o el documento base frente a todos. */
  readonly heading: ReactNode;
  readonly options: OptionsPanelProps;
}

/** Cuántos cambios hay y cuántos importan: «12 cambios · 5 importantes». */
function ChangeSummary({ changes }: { readonly changes: readonly ChangeResult[] }) {
  const { tPlural } = useI18n();
  const important = importantCount(changes);
  return (
    <span className={styles.summaryLine}>
      {tPlural({ key: "comparison.summary.changes", count: changes.length })}
      {" · "}
      {tPlural({ key: "comparison.summary.important", count: important })}
    </span>
  );
}

/** La línea superior: qué se compara, el resumen corto y «Opciones» (todo lo demás va plegado). */
export function VersionsToolbar({ heading, options }: VersionsToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.documents}>{heading}</div>
      <ChangeSummary changes={options.changes} />
      <ComparisonOptions {...options} />
    </div>
  );
}
