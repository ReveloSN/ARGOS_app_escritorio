import { Button } from "../components/atoms/Button";
import { EmptyState } from "../components/molecules/EmptyState";
import { NEW_REVIEW_SHORTCUT } from "../components/organisms/sidebarSections";
import { EngineUnavailableMessage } from "../features/engine/EngineUnavailableMessage";
import { useEngineStatus } from "../features/engine/useEngineStatus";
import { useI18n } from "../i18n/i18nContext";
import styles from "./Page.module.css";

interface HomePageProps {
  readonly onNewReview: () => void;
  readonly onCompare: () => void;
}

/** Inicio, primer uso: estado vacío y «Nueva revisión». Sin datos inventados. */
export function HomePage({ onNewReview, onCompare }: HomePageProps) {
  const { t } = useI18n();
  const engineStatus = useEngineStatus();

  return (
    <div className={styles.page}>
      {engineStatus === "stopped" && <EngineUnavailableMessage />}
      <EmptyState
        icon="folder_open"
        title={t("home.title")}
        description={t("home.description")}
        note={t("home.note")}
        actions={
          <>
            <Button variant="primary" shortcut={NEW_REVIEW_SHORTCUT} onClick={onNewReview}>
              {t("navigation.newReview")}
            </Button>
            <Button onClick={onCompare}>{t("home.compareVersions")}</Button>
          </>
        }
      />
    </div>
  );
}
