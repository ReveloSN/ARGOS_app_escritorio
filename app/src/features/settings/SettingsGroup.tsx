import type { ReactNode } from "react";

import { useI18n } from "../../i18n/i18nContext";
import styles from "./Settings.module.css";
import type { SettingsGroupItem } from "./settingsSections";

interface SettingsGroupProps {
  readonly group: SettingsGroupItem;
  readonly children: ReactNode;
}

/** Un grupo de Ajustes: título, una línea que dice de qué depende y sus secciones. */
export function SettingsGroup({ group, children }: SettingsGroupProps) {
  const { t } = useI18n();
  const headingId = `settings-group-${group.id}`;
  return (
    <section aria-labelledby={headingId} className={styles.group}>
      <header className={styles.groupHeader}>
        <h2 id={headingId} className={styles.groupTitle}>
          {t(group.title)}
        </h2>
        <p className={styles.groupDescription}>{t(group.description)}</p>
      </header>
      {children}
    </section>
  );
}
