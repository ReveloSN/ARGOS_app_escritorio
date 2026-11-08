import { useI18n } from "../../i18n/i18nContext";
import styles from "./Settings.module.css";

interface SettingsLoadStateProps {
  readonly isFailed: boolean;
}

/** El error y el reintento son comunes a la página; cada sección solo indica disponibilidad. */
export function SettingsLoadState({ isFailed }: SettingsLoadStateProps) {
  const { t } = useI18n();
  return (
    <p className={styles.description}>
      {t(isFailed ? "settings.unavailable.section" : "settings.loading")}
    </p>
  );
}
