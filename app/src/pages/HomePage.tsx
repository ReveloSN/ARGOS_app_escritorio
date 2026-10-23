import { Button } from "../components/atoms/Button";
import { ReticleMotif } from "../components/atoms/ReticleMotif";
import { NEW_REVIEW_SHORTCUT } from "../components/organisms/sidebarSections";
import { AssistantEye } from "../features/assistant/AssistantEye";
import { useAssistantStatus } from "../features/assistant/useAssistantStatus";
import { EngineUnavailableMessage } from "../features/engine/EngineUnavailableMessage";
import { useEngineStatus } from "../features/engine/useEngineStatus";
import { useI18n } from "../i18n/i18nContext";
import styles from "./HomePage.module.css";

interface HomePageProps {
  readonly onNewReview: () => void;
  readonly onCompare: () => void;
}

/** Inicio, primer uso: el asistente sobre la retícula y «Nueva revisión». Sin datos inventados. */
export function HomePage({ onNewReview, onCompare }: HomePageProps) {
  const { t } = useI18n();
  const engineStatus = useEngineStatus();
  const assistant = useAssistantStatus();

  return (
    <div className={styles.home}>
      {engineStatus === "stopped" && (
        <div className={styles.notice}>
          <EngineUnavailableMessage />
        </div>
      )}
      <div className={styles.stage}>
        <ReticleMotif size="lg" className={styles.reticle} />
        <div className={styles.content}>
          <AssistantEye
            state={assistant.status.eye}
            size="lg"
            label={t("assistant.label", { status: assistant.text })}
          />
          <h1 className={styles.title}>{t("home.title")}</h1>
          <p className={styles.description}>{t("home.description")}</p>
          <div className={styles.actions}>
            <Button variant="primary" shortcut={NEW_REVIEW_SHORTCUT} onClick={onNewReview}>
              {t("navigation.newReview")}
            </Button>
            <Button onClick={onCompare}>{t("home.compareVersions")}</Button>
          </div>
          <span className={styles.note}>{t("home.note")}</span>
        </div>
      </div>
    </div>
  );
}
