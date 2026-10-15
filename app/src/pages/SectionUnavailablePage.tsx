import { EmptyState } from "../components/molecules/EmptyState";
import { useI18n } from "../i18n/i18nContext";
import styles from "./Page.module.css";

/** Historial y Ajustes aún no están construidos: se dice con claridad, sin datos de ejemplo. */
export function SectionUnavailablePage() {
  const { t } = useI18n();
  return (
    <div className={styles.page}>
      <EmptyState
        icon="schedule"
        title={t("unavailableSection.title")}
        description={t("unavailableSection.description")}
      />
    </div>
  );
}
