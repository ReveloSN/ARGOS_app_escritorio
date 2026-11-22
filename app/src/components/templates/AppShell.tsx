import type { ReactNode } from "react";

import styles from "./AppShell.module.css";

interface AppShellProps {
  readonly sidebar: ReactNode;
  readonly topbar: ReactNode;
  /** Aviso global (motor detenido): fijo bajo la barra superior, fuera del desplazamiento. */
  readonly notice?: ReactNode;
  /** Con una puerta por encima, todo el shell queda inerte: sin foco, puntero ni lectores. */
  readonly isInert?: boolean;
  readonly children: ReactNode;
}

/** Navegación global persistente: barra lateral colapsable y barra superior (CLAUDE.md §9). */
export function AppShell({ sidebar, topbar, notice, isInert, children }: AppShellProps) {
  return (
    <div className={styles.shell} inert={isInert}>
      <div className={styles.sidebar}>{sidebar}</div>
      {topbar}
      <div className={styles.notice}>{notice}</div>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
