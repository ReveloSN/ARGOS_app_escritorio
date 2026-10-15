import { Icon } from "../atoms/Icon";
import styles from "./SourceLine.module.css";

interface SourceLineProps {
  readonly fileName: string;
  /** Ubicación ya traducida: «Página 1 · Encabezado», «Hoja Resumen · C12». */
  readonly location: string;
  readonly icon?: string;
}

/** Origen de un valor: nunca se muestra un valor sin su archivo y ubicación (CLAUDE.md §7). */
export function SourceLine({ fileName, location, icon = "description" }: SourceLineProps) {
  return (
    <span className={styles.source}>
      <Icon name={icon} size="sm" className={styles.icon} />
      <span className={styles.file}>{fileName}</span>
      <span aria-hidden="true">·</span>
      <span>{location}</span>
    </span>
  );
}
