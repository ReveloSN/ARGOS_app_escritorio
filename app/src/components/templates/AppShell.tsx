import type { ReactNode } from "react";

import styles from "./AppShell.module.css";

interface AppShellProps {
  readonly sidebar: ReactNode;
  readonly topbar: ReactNode;
  /** Aviso global (motor detenido): fijo bajo la barra superior, fuera del desplazamiento. */
  readonly notice?: ReactNode;
  readonly children: ReactNode;
}

/** Navegación global persistente: barra lateral colapsable y barra superior (CLAUDE.md §9). */
export function AppShell({ sidebar, topbar, notice, children }: AppShellProps) {
  return (
    <div className={styles.shell}>
      <div className={styles.sidebar}>{sidebar}</div>
      {topbar}
      <div className={styles.notice}>{notice}</div>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
