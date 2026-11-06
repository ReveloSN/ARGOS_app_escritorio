import type { ReactNode } from "react";

import { useI18n } from "../../i18n/i18nContext";
import { Icon } from "../atoms/Icon";
import { Kbd, MODIFIER_KEY } from "../atoms/Kbd";
import {
  AssistantStatusIndicator,
  type AssistantStatusLine,
} from "../molecules/AssistantStatusIndicator";
import styles from "./Topbar.module.css";

const SEARCH_SHORTCUT = [MODIFIER_KEY, "K"];

interface TopbarProps {
  /** El selector de la sesión activa; sin sesión no se muestra nada. */
  readonly session?: ReactNode;
  readonly searchPlaceholder?: string | undefined;
  /** Sin estado no se muestra nada: la barra lateral ya lo dice. */
  readonly assistantStatus?: AssistantStatusLine | undefined;
  /** Sin acción no se muestra la búsqueda: nunca un control que no hace nada. */
  readonly onOpenSearch?: (() => void) | undefined;
  readonly onOpenHelp?: () => void;
}

export function Topbar({
  session,
  searchPlaceholder,
  assistantStatus,
  onOpenSearch,
  onOpenHelp,
}: TopbarProps) {
  const { t } = useI18n();
  const placeholder = searchPlaceholder ?? t("topbar.searchPlaceholder");

  return (
    <header className={styles.topbar}>
      {session}
      {onOpenSearch && (
        <button type="button" className={styles.search} onClick={onOpenSearch}>
          <Icon name="search" size="md" />
          <span className={styles.placeholder}>{placeholder}</span>
          <Kbd keys={SEARCH_SHORTCUT} />
        </button>
      )}
      <div className={styles.spacer} />
      {assistantStatus && <AssistantStatusIndicator status={assistantStatus} />}
      {onOpenHelp && (
        <button
          type="button"
          title={t("topbar.help")}
          aria-label={t("topbar.help")}
          className={styles.help}
          onClick={onOpenHelp}
        >
          <Icon name="keyboard" size="md" />
        </button>
      )}
    </header>
  );
}
