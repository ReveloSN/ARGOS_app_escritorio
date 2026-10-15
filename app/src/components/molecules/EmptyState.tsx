import type { ReactNode } from "react";

import { Icon } from "../atoms/Icon";
import { joinClassNames } from "../joinClassNames";
import styles from "./EmptyState.module.css";

interface EmptyStateProps {
  readonly icon: string;
  readonly title: string;
  readonly description: ReactNode;
  readonly actions?: ReactNode;
  readonly note?: string;
  /** Resultado positivo («No se encontraron inconsistencias»): icono en círculo de acento. */
  readonly isReassuring?: boolean;
}

export function EmptyState({
  icon,
  title,
  description,
  actions,
  note,
  isReassuring = false,
}: EmptyStateProps) {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <span className={joinClassNames(styles.icon, isReassuring && styles.reassuring)}>
          <Icon name={icon} size={isReassuring ? "lg" : "xl"} />
        </span>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.description}>{description}</p>
        {actions && <div className={styles.actions}>{actions}</div>}
        {note && <span className={styles.note}>{note}</span>}
      </div>
    </div>
  );
}
