import { joinClassNames } from "../joinClassNames";
import styles from "./Tag.module.css";

interface FileTypeBadgeProps {
  /** Formato tal como se muestra: PDF, DOCX, XLSX, EML. No se traduce. */
  readonly format: string;
  readonly isUnreadable?: boolean;
}

export function FileTypeBadge({ format, isUnreadable = false }: FileTypeBadgeProps) {
  return (
    <span
      className={joinClassNames(styles.tag, styles.fileType, isUnreadable && styles.unreadable)}
    >
      {format}
    </span>
  );
}
