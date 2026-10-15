import { Icon } from "../atoms/Icon";
import { joinClassNames } from "../joinClassNames";
import styles from "./NavItem.module.css";

interface NavItemProps {
  readonly icon: string;
  readonly label: string;
  readonly active?: boolean;
  readonly collapsed?: boolean;
  readonly badge?: string | undefined;
  readonly onSelect: () => void;
}

// Una línea con elipsis; el tooltip conserva el texto completo (CLAUDE.md §9, i18n).
export function NavItem({ active = false, collapsed = false, ...item }: NavItemProps) {
  const className = joinClassNames(
    styles.item,
    active && styles.active,
    collapsed && styles.collapsed,
  );
  return (
    <button
      type="button"
      title={item.label}
      aria-label={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      className={className}
      onClick={item.onSelect}
    >
      {collapsed ? (
        <Icon name={item.icon} size="lg" className={styles.icon} />
      ) : (
        <ExpandedContent icon={item.icon} label={item.label} badge={item.badge} />
      )}
    </button>
  );
}

function ExpandedContent({ icon, label, badge }: Pick<NavItemProps, "icon" | "label" | "badge">) {
  return (
    <>
      <Icon name={icon} size="md" className={styles.icon} />
      <span className={styles.label}>{label}</span>
      {badge && <span className={styles.badge}>{badge}</span>}
    </>
  );
}
