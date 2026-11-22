import { useI18n } from "../../i18n/i18nContext";
import styles from "./Settings.module.css";
import { hasAccountFeature, useAccount } from "../account/accountContext";
import {
  scrollToSettingsSection,
  settingsGroupsFor,
  type SettingsSectionId,
} from "./settingsSections";

interface SettingsNavProps {
  readonly active: SettingsSectionId;
  readonly onSelect: (id: SettingsSectionId) => void;
}

/** Índice de Ajustes: los grupos son encabezados de texto; solo las secciones son botones. */
export function SettingsNav({ active, onSelect }: SettingsNavProps) {
  const { t } = useI18n();
  const { state } = useAccount();
  return (
    <nav aria-label={t("settings.navLabel")} className={styles.nav}>
      {settingsGroupsFor(hasAccountFeature(state)).map((group) => (
        <div key={group.id} role="group" aria-label={t(group.title)} className={styles.navGroup}>
          <span aria-hidden="true" className={styles.navGroupTitle}>
            {t(group.title)}
          </span>
          {group.sections.map((section) => (
            <button
              key={section.id}
              type="button"
              aria-current={section.id === active ? "true" : undefined}
              className={styles.navItem}
              onClick={() => {
                onSelect(section.id);
                scrollToSettingsSection(section.id);
              }}
            >
              {t(section.title)}
            </button>
          ))}
        </div>
      ))}
    </nav>
  );
}
