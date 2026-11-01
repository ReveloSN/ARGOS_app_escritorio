import { ErrorMessage } from "../../components/molecules/ErrorMessage";
import { Toast } from "../../components/molecules/Toast";
import { useI18n } from "../../i18n/i18nContext";
import styles from "./SessionNotice.module.css";
import type { PendingSessionDeletion } from "./usePendingSessionDeletion";
import type { SessionSwitch } from "./useSessionSwitch";

interface SessionNoticeProps {
  readonly deletion: PendingSessionDeletion;
  readonly switching: SessionSwitch;
}

/** Avisos de la sesión: «eliminada» con Deshacer, y los fallos al abrir otra o al eliminar. */
export function SessionNotice({ deletion, switching }: SessionNoticeProps) {
  const { t } = useI18n();
  return (
    <div className={styles.notice}>
      {switching.hasFailed && (
        <ErrorMessage
          tone="neutral"
          what={t("sessionMenu.failed.what")}
          why={t("sessionMenu.failed.why")}
          todo={t("sessionMenu.failed.todo")}
          primaryAction={{
            label: t("sessionMenu.failed.dismiss"),
            onClick: switching.dismissFailure,
          }}
        />
      )}
      {deletion.failedDeletion && (
        <ErrorMessage
          tone="neutral"
          what={t("sessionMenu.deleteFailed.what", { name: deletion.failedDeletion.session.name })}
          why={t("sessionMenu.deleteFailed.why")}
          todo={t("sessionMenu.deleteFailed.todo")}
          primaryAction={{
            label: t("sessionMenu.failed.dismiss"),
            onClick: deletion.dismissFailure,
          }}
        />
      )}
      <Toast
        message={
          deletion.deleted ? t("sessionMenu.deleted", { name: deletion.deleted.session.name }) : ""
        }
        visible={deletion.deleted !== null}
        onUndo={deletion.deleted ? deletion.undo : undefined}
        hasUndoShortcut={false}
      />
    </div>
  );
}
