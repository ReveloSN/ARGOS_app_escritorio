import { useState } from "react";

import { Icon } from "../components/atoms/Icon";
import { AiSection } from "../features/settings/AiSection";
import { DetectionSection } from "../features/settings/DetectionSection";
import { EngineSettings } from "../features/settings/EngineSettings";
import { LanguageSection } from "../features/settings/LanguageSection";
import { PrivacySection } from "../features/settings/PrivacySection";
import styles from "../features/settings/Settings.module.css";
import { SettingsSection } from "../features/settings/SettingsSection";
import { scrollToSettingsSection, SETTINGS_SECTIONS } from "../features/settings/settingsSections";
import { ShortcutsSection } from "../features/settings/ShortcutsSection";
import { AppearanceSwitch } from "../features/settings/theme/AppearanceSwitch";
import { useEnginePreferences } from "../features/settings/useEnginePreferences";
import { useI18n } from "../i18n/i18nContext";

const SECTIONS = SETTINGS_SECTIONS;

/** Ajustes: cada cambio se guarda al instante y se confirma con la hora (mockup 05). */
export function SettingsPage() {
  const { t, format } = useI18n();
  const [active, setActive] = useState(SECTIONS[0]?.id);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const markSaved = () => {
    setSavedAt(new Date());
  };
  const engine = useEnginePreferences(markSaved);
  const title = (id: string) =>
    t(SECTIONS.find((section) => section.id === id)?.title ?? "settings.title");

  return (
    <div className={styles.layout}>
      <nav aria-label={t("settings.navLabel")} className={styles.nav}>
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            aria-current={section.id === active ? "true" : undefined}
            className={styles.navItem}
            onClick={() => {
              setActive(section.id);
              scrollToSettingsSection(section.id);
            }}
          >
            {t(section.title)}
          </button>
        ))}
      </nav>
      <div className={styles.scroll}>
        <div className={styles.content}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{t("settings.title")}</h1>
            {savedAt && (
              <span role="status" className={styles.saved}>
                <Icon name="check" size="sm" className={styles.savedIcon} />
                {t("settings.saved")} · <span className={styles.mono}>{format.time(savedAt)}</span>
              </span>
            )}
          </div>
          <SettingsSection id="detection" title={title("detection")}>
            <EngineSettings engine={engine}>
              {(preferences) => <DetectionSection preferences={preferences} engine={engine} />}
            </EngineSettings>
          </SettingsSection>
          <SettingsSection id="language" title={title("language")}>
            <LanguageSection onSaved={markSaved} />
          </SettingsSection>
          <SettingsSection id="appearance" title={title("appearance")}>
            <AppearanceSwitch onChange={markSaved} />
          </SettingsSection>
          <SettingsSection id="privacy" title={title("privacy")}>
            <EngineSettings engine={engine}>
              {(preferences) => <PrivacySection preferences={preferences} engine={engine} />}
            </EngineSettings>
          </SettingsSection>
          <SettingsSection id="ai" title={title("ai")}>
            <AiSection onSaved={markSaved} />
          </SettingsSection>
          <SettingsSection id="shortcuts" title={title("shortcuts")}>
            <ShortcutsSection />
          </SettingsSection>
        </div>
      </div>
    </div>
  );
}
