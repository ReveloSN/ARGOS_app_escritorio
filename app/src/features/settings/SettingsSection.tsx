import type { ReactNode } from "react";

import styles from "./Settings.module.css";

interface SettingsSectionProps {
  readonly id: string;
  readonly title: string;
  readonly children: ReactNode;
}

export function SettingsSection({ id, title, children }: SettingsSectionProps) {
  const headingId = `${id}-title`;
  return (
    <section id={id} aria-labelledby={headingId} className={styles.section}>
      <h2 id={headingId} className={styles.sectionTitle}>
        {title}
      </h2>
      {children}
    </section>
  );
}
