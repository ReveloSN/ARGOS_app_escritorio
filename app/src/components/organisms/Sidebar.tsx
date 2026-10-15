import { useI18n } from "../../i18n/i18nContext";
import { BrandMark } from "../atoms/BrandMark";
import { Button } from "../atoms/Button";
import { Icon } from "../atoms/Icon";
import { Kbd } from "../atoms/Kbd";
import { NavItem } from "../molecules/NavItem";
import styles from "./Sidebar.module.css";
import {
  NEW_REVIEW_SHORTCUT,
  SIDEBAR_SECTIONS,
  TOGGLE_SIDEBAR_SHORTCUT,
  type SidebarSection,
} from "./sidebarSections";

export interface ActiveSessionSummary {
  readonly name: string;
  readonly summary: string;
}

interface SidebarProps {
  readonly active: SidebarSection;
  readonly collapsed: boolean;
  readonly session?: ActiveSessionSummary;
  readonly reviewBadge?: string;
  readonly onNavigate: (section: SidebarSection) => void;
  readonly onToggleCollapsed: () => void;
  readonly onNewReview: () => void;
}

export function Sidebar(props: SidebarProps) {
  const { t } = useI18n();
  return (
    <nav
      aria-label={t("navigation.label")}
      className={props.collapsed ? styles.collapsed : styles.expanded}
    >
      <div className={styles.brand}>
        <BrandMark />
        {!props.collapsed && <span className={styles.name}>{t("app.name")}</span>}
      </div>
      <SectionList {...props} />
      {!props.collapsed && props.session && <SessionCard session={props.session} />}
      <div className={styles.spacer} />
      {props.collapsed ? <CollapsedFooter {...props} /> : <ExpandedFooter {...props} />}
    </nav>
  );
}

function SectionList({ active, collapsed, reviewBadge, onNavigate }: SidebarProps) {
  const { t } = useI18n();
  return (
    <div className={styles.sections}>
      {SIDEBAR_SECTIONS.map((item) => (
        <NavItem
          key={item.section}
          icon={item.icon}
          label={t(item.label)}
          active={item.section === active}
          collapsed={collapsed}
          {...(item.section === "review" && reviewBadge ? { badge: reviewBadge } : {})}
          onSelect={() => {
            onNavigate(item.section);
          }}
        />
      ))}
    </div>
  );
}

function SessionCard({ session }: { session: ActiveSessionSummary }) {
  const { t } = useI18n();
  return (
    <div className={styles.session}>
      <span className={styles.sessionLabel}>{t("navigation.activeSession")}</span>
      <span title={session.name} className={styles.sessionName}>
        {session.name}
      </span>
      <span className={styles.sessionSummary}>{session.summary}</span>
    </div>
  );
}

function ExpandedFooter({ onNewReview, onToggleCollapsed }: SidebarProps) {
  const { t } = useI18n();
  return (
    <div className={styles.footer}>
      <Button variant="primary" icon="add" shortcut={NEW_REVIEW_SHORTCUT} onClick={onNewReview}>
        {t("navigation.newReview")}
      </Button>
      <button type="button" className={styles.collapseToggle} onClick={onToggleCollapsed}>
        <Icon name="left_panel_close" size="md" />
        <span className={styles.grow}>{t("navigation.collapse")}</span>
        <Kbd keys={TOGGLE_SIDEBAR_SHORTCUT} variant="inline" />
      </button>
      <span className={styles.localNote}>
        <Icon name="lock" size="sm" />
        {t("navigation.localAnalysis")}
      </span>
    </div>
  );
}

function CollapsedFooter({ onNewReview, onToggleCollapsed }: SidebarProps) {
  const { t } = useI18n();
  return (
    <div className={styles.collapsedFooter}>
      <button
        type="button"
        title={t("navigation.newReview")}
        aria-label={t("navigation.newReview")}
        className={styles.newReviewIcon}
        onClick={onNewReview}
      >
        <Icon name="add" size="lg" />
      </button>
      <button
        type="button"
        title={t("navigation.expand")}
        aria-label={t("navigation.expand")}
        className={styles.expandIcon}
        onClick={onToggleCollapsed}
      >
        <Icon name="left_panel_open" size="lg" />
      </button>
    </div>
  );
}
