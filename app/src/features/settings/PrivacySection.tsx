import { Icon } from "../../components/atoms/Icon";
import { Toggle } from "../../components/atoms/Toggle";
import { useI18n } from "../../i18n/i18nContext";
import type { PreferencesResult } from "../../services/engine/preferencesTypes";
import styles from "./Settings.module.css";
import type { EnginePreferences } from "./useEnginePreferences";

interface PrivacySectionProps {
  readonly preferences: PreferencesResult;
  readonly engine: EnginePreferences;
}

/** Ajustes > Privacidad: el análisis es local y cuánto tiempo se guarda el historial. */
export function PrivacySection({ preferences, engine }: PrivacySectionProps) {
  const { t } = useI18n();
  const isLimited = preferences.hasRetentionLimit;
  return (
    <>
      <div className={styles.privacyBox}>
        <Icon name="lock" size="lg" className={styles.privacyIcon} />
        <div className={styles.privacyText}>
          <span className={styles.privacyTitle}>{t("settings.privacy.localTitle")}</span>
          <span>{t("settings.privacy.localDescription")}</span>
        </div>
      </div>
      <div className={styles.retention}>
        <Toggle
          label={t("settings.privacy.retention")}
          checked={isLimited}
          onChange={(checked) => {
            engine.save({ hasRetentionLimit: checked });
          }}
        />
        <span title={t("settings.privacy.folder")} className={styles.folder}>
          {preferences.historyFolder}
        </span>
      </div>
      <p className={styles.description}>
        {t(isLimited ? "settings.privacy.retentionOn" : "settings.privacy.retentionOff")}
      </p>
    </>
  );
}
