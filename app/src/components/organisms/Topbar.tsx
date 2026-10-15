import { useI18n } from "../../i18n/i18nContext";
import { Icon } from "../atoms/Icon";
import { Kbd, MODIFIER_KEY } from "../atoms/Kbd";
import { EngineStatusIndicator, type EngineStatusView } from "../molecules/EngineStatusIndicator";
import styles from "./Topbar.module.css";

const SEARCH_SHORTCUT = [MODIFIER_KEY, "K"];

interface TopbarProps {
  readonly sessionName?: string;
  readonly searchPlaceholder?: string;
  readonly engineStatus: EngineStatusView;
  readonly onOpenSearch: () => void;
  readonly onOpenHelp: () => void;
}

export function Topbar({
  sessionName,
  searchPlaceholder,
  engineStatus,
  onOpenSearch,
  onOpenHelp,
}: TopbarProps) {
  const { t } = useI18n();
  const placeholder = searchPlaceholder ?? t("topbar.searchPlaceholder");

  return (
    <header className={styles.topbar}>
      {sessionName && (
        <div className={styles.session}>
          <span className={styles.sessionLabel}>{t("topbar.session")}</span>
          <span title={sessionName} className={styles.sessionName}>
            {sessionName}
          </span>
          <Icon name="expand_more" size="md" className={styles.muted} />
        </div>
      )}
      <button type="button" className={styles.search} onClick={onOpenSearch}>
        <Icon name="search" size="md" />
        <span className={styles.placeholder}>{placeholder}</span>
        <Kbd keys={SEARCH_SHORTCUT} />
      </button>
      <div className={styles.spacer} />
      <EngineStatusIndicator status={engineStatus} />
      <button
        type="button"
        title={t("topbar.help")}
        aria-label={t("topbar.help")}
        className={styles.help}
        onClick={onOpenHelp}
      >
        <Icon name="keyboard" size="md" />
      </button>
    </header>
  );
}
