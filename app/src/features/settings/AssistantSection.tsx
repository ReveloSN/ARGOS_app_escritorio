import { Button } from "../../components/atoms/Button";
import { Toggle } from "../../components/atoms/Toggle";
import { useI18n } from "../../i18n/i18nContext";
import { useAssistantPreferences } from "../assistant/assistantContext";
import { AssistantEye } from "../assistant/AssistantEye";
import styles from "./Settings.module.css";

/** Ajustes › Asistente: mostrarlo u ocultarlo, reducir movimiento y volver a ver los primeros pasos. */
export function AssistantSection({ onSaved }: { onSaved: () => void }) {
  const { t } = useI18n();
  const preferences = useAssistantPreferences();
  return (
    <>
      <div className={styles.inlineRow}>
        <Toggle
          label={t("settings.assistant.show")}
          checked={preferences.isAssistantShown}
          onChange={(isShown) => {
            preferences.setAssistantShown(isShown);
            onSaved();
          }}
        />
        <AssistantEye state="reading" size="sm" />
      </div>
      <p className={styles.description}>{t("settings.assistant.showHint")}</p>
      <Toggle
        label={t("settings.assistant.reduceMotion")}
        checked={preferences.isMotionReduced}
        onChange={(isReduced) => {
          preferences.setMotionReduced(isReduced);
          onSaved();
        }}
      />
      <p className={styles.description}>{t("settings.assistant.reduceMotionHint")}</p>
      <div className={styles.inlineRow}>
        <Button size="md" icon="school" onClick={preferences.openOnboarding}>
          {t("settings.assistant.onboarding")}
        </Button>
      </div>
    </>
  );
}
