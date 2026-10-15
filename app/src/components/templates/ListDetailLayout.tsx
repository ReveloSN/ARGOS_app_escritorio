import type { ReactNode } from "react";

import styles from "./ListDetailLayout.module.css";

interface ListDetailLayoutProps {
  readonly header: ReactNode;
  readonly list: ReactNode;
  readonly detail: ReactNode;
}

/** Template de Resultados y Detalle de alerta: lista a la izquierda, detalle a la derecha. */
export function ListDetailLayout({ header, list, detail }: ListDetailLayoutProps) {
  return (
    <div className={styles.layout}>
      <div className={styles.header}>{header}</div>
      <div className={styles.list}>{list}</div>
      <div className={styles.detail}>{detail}</div>
    </div>
  );
}
