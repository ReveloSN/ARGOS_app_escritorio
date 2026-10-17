import { Icon } from "../../components/atoms/Icon";
import { ErrorMessage } from "../../components/molecules/ErrorMessage";
import { useI18n } from "../../i18n/i18nContext";
import styles from "./Settings.module.css";
import type { HistoryFolderChange } from "./useHistoryFolderChange";

/** Progreso, confirmación o error al mover el historial. */
export function HistoryFolderFeedback({ move }: { readonly move: HistoryFolderChange }) {
  const { t } = useI18n();
  const { state } = move;
  if (state.status === "moving") {
    return (
      <p role="status" className={styles.description}>
        {t("settings.privacy.moving")}
      </p>
    );
  }
  if (state.status === "moved") {
    return (
      <p role="status" className={styles.saved}>
        <Icon name="check" size="sm" className={styles.savedIcon} />
        {t("settings.privacy.moved")}
      </p>
    );
  }
  if (state.status !== "failed") return null;
  const messages = `settings.folderErrors.${state.failure}` as const;
  return (
    <ErrorMessage
      tone="neutral"
      icon="folder_open"
      what={t(`${messages}.what`)}
      why={t(`${messages}.why`)}
      todo={t(`${messages}.todo`)}
      primaryAction={{ label: t("settings.folderErrors.chooseAnother"), onClick: move.change }}
    />
  );
}

interface HistoryFolderPathProps {
  readonly folder: string;
  readonly move: HistoryFolderChange | null;
}

/** Carpeta del historial y, en la app de escritorio, «Cambiar carpeta». */
export function HistoryFolderPath({ folder, move }: HistoryFolderPathProps) {
  const { t } = useI18n();
  return (
    <>
      <span title={t("settings.privacy.folder")} className={styles.folder}>
        {folder}
      </span>
      {move && (
        <button
          type="button"
          className={styles.link}
          disabled={move.state.status === "moving"}
          onClick={move.change}
        >
          {t("settings.privacy.changeFolder")}
        </button>
      )}
    </>
  );
}
