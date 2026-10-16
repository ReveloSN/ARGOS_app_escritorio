import { SourceLine } from "./SourceLine";
import styles from "./OccurrenceList.module.css";

export interface OccurrenceView {
  readonly fileName: string;
  /** Ubicación ya traducida («Página 3»). */
  readonly location: string;
  readonly excerpt: string;
}

interface OccurrenceListProps {
  readonly label: string;
  readonly occurrences: readonly OccurrenceView[];
}

/** Todas las apariciones de un valor, cada una con su archivo, ubicación y fragmento. */
export function OccurrenceList({ label, occurrences }: OccurrenceListProps) {
  return (
    <ol aria-label={label} className={styles.list}>
      {occurrences.map((occurrence, index) => (
        <li key={`${String(index)}-${occurrence.fileName}`} className={styles.item}>
          <SourceLine fileName={occurrence.fileName} location={occurrence.location} />
          <span className={styles.excerpt}>{occurrence.excerpt}</span>
        </li>
      ))}
    </ol>
  );
}
