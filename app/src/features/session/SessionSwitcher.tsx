import { useRef, useState } from "react";

import { Icon } from "../../components/atoms/Icon";
import { ActionMenu, type MenuAction } from "../../components/molecules/ActionMenu";
import { useI18n } from "../../i18n/i18nContext";
import { DeleteSessionDialog } from "./DeleteSessionDialog";
import { RenameSessionDialog } from "./RenameSessionDialog";
import { activeSessionItem } from "./sessionList";
import { manageActions, sessionActions } from "./sessionMenuActions";
import type { ReviewDigest } from "./sessionSnapshot";
import styles from "./SessionSwitcher.module.css";
import { useSessionList } from "./useSessionList";
import type { SessionRename } from "./useSessionRename";

type Dialog = "rename" | "delete" | null;

interface SessionSwitcherProps {
  readonly active: ReviewDigest;
  readonly renaming: SessionRename;
  readonly onSwitch: (sessionId: string) => void;
  readonly onNewSession: () => void;
  readonly onDelete: () => void;
}

/** «Sesión · nombre ▾»: menú con las sesiones, la activa marcada, y Nueva, Renombrar y Eliminar. */
export function SessionSwitcher(props: SessionSwitcherProps) {
  const { active } = props;
  const i18n = useI18n();
  const { t } = i18n;
  const trigger = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const list = useSessionList(active);
  const items = list.status === "ready" ? list.data : [activeSessionItem(active)];
  const close = () => {
    setIsOpen(false);
    trigger.current?.focus();
  };
  const actions: readonly MenuAction[] = [
    ...sessionActions(items, i18n, props.onSwitch),
    ...manageActions(t, {
      onNew: props.onNewSession,
      onRename: () => {
        setDialog("rename");
      },
      onDelete: () => {
        setDialog("delete");
      },
    }),
  ];
  return (
    <div className={styles.session}>
      <button
        ref={trigger}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={t("sessionMenu.trigger", { name: active.name })}
        className={styles.trigger}
        onClick={() => {
          setIsOpen((open) => !open);
        }}
      >
        <span className={styles.label}>{t("topbar.session")}</span>
        <span title={active.name} className={styles.name}>
          {active.name}
        </span>
        <Icon name={isOpen ? "expand_less" : "expand_more"} size="md" />
      </button>
      {isOpen && (
        <ActionMenu
          label={t("sessionMenu.menuLabel")}
          actions={actions}
          align="start"
          onClose={close}
        />
      )}
      {dialog === "rename" && (
        <RenameSessionDialog
          currentName={active.name}
          renaming={props.renaming}
          onClose={() => {
            setDialog(null);
          }}
        />
      )}
      {dialog === "delete" && (
        <DeleteSessionDialog
          name={active.name}
          onConfirm={props.onDelete}
          onClose={() => {
            setDialog(null);
          }}
        />
      )}
    </div>
  );
}
