import type { ReactNode } from "react";

import styles from "./WizardLayout.module.css";

interface WizardLayoutProps {
  readonly header: ReactNode;
  readonly content: ReactNode;
  readonly aside: ReactNode;
  readonly footer: ReactNode;
}

/** Template del wizard de Nueva revisión: pasos, contenido, opciones y acciones al pie. */
export function WizardLayout({ header, content, aside, footer }: WizardLayoutProps) {
  return (
    <div className={styles.layout}>
      <div className={styles.header}>{header}</div>
      <div className={styles.body}>
        <div className={styles.content}>{content}</div>
        <aside className={styles.aside}>{aside}</aside>
      </div>
      <footer className={styles.footer}>{footer}</footer>
    </div>
  );
}
