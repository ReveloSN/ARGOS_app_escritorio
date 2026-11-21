import { BreakableText } from "../atoms/BreakableText";
import { Icon } from "../atoms/Icon";
import styles from "./SourceLine.module.css";

interface SourceLineProps {
  readonly fileName: string;
  /** Ubicación ya traducida: «Página 1 · Encabezado», «Hoja Resumen · C12». */
  readonly location: string;
  readonly icon?: string;
}

/**
 * Origen de un valor: nunca se muestra un valor sin su archivo y ubicación (CLAUDE.md §7).
 * Archivo y ubicación son una sola línea de texto: un nombre largo se parte por sus separadores
 * y la ubicación sigue a continuación, sin un «·» suelto al principio de la línea.
 */
export function SourceLine({ fileName, location, icon = "description" }: SourceLineProps) {
  return (
    <span className={styles.source}>
      <Icon name={icon} size="sm" className={styles.icon} />
      <span className={styles.text}>
        <span className={styles.file}>
          <BreakableText text={fileName} />
        </span>
        {location && (
          <span className={styles.location}>
            <span aria-hidden="true"> · </span>
            {location}
          </span>
        )}
      </span>
    </span>
  );
}
