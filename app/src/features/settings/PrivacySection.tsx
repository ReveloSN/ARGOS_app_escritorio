import { Icon } from "../../components/atoms/Icon";
import { Toggle } from "../../components/atoms/Toggle";
import { useI18n } from "../../i18n/i18nContext";
import type { PreferencesResult } from "../../services/engine/preferencesTypes";
import { HistoryFolderFeedback, HistoryFolderPath } from "./HistoryFolder";
import styles from "./Settings.module.css";
import type { EnginePreferences } from "./useEnginePreferences";
import { useHistoryFolderChange } from "./useHistoryFolderChange";

interface PrivacySectionProps {
  readonly preferences: PreferencesResult;
  readonly engine: EnginePreferences;
}

/** Ajustes > Privacidad: el análisis es local, cuánto tiempo se guarda el historial y dónde. */
export function PrivacySection({ preferences, engine }: PrivacySectionProps) {
  const { t } = useI18n();
  const isLimited = preferences.hasRetentionLimit;
  const move = useHistoryFolderChange(engine.refresh);
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
        <HistoryFolderPath folder={preferences.historyFolder} move={move} />
      </div>
      <p className={styles.description}>
        {t(isLimited ? "settings.privacy.retentionOn" : "settings.privacy.retentionOff")}
      </p>
      {move && <HistoryFolderFeedback move={move} />}
    </>
  );
}
