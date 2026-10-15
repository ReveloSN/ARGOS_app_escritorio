import { useI18n } from "../../i18n/i18nContext";
import { joinClassNames } from "../joinClassNames";
import styles from "./Breadcrumb.module.css";

export interface BreadcrumbItem {
  readonly id: string;
  readonly label: string;
  readonly isMonospace?: boolean;
  readonly onSelect?: () => void;
}

interface BreadcrumbProps {
  readonly items: readonly BreadcrumbItem[];
}

/** Ruta contextual: cada nivel anterior es un enlace de regreso; el último es la vista actual. */
export function Breadcrumb({ items }: BreadcrumbProps) {
  const { t } = useI18n();

  return (
    <nav aria-label={t("navigationAids.breadcrumb")}>
      <ol className={styles.trail}>
        {items.map((item, index) => (
          <li key={item.id} className={styles.level}>
            {index > 0 && (
              <span aria-hidden="true" className={styles.separator}>
                ›
              </span>
            )}
            <BreadcrumbLevel item={item} isCurrent={index === items.length - 1} />
          </li>
        ))}
      </ol>
    </nav>
  );
}

function BreadcrumbLevel({ item, isCurrent }: { item: BreadcrumbItem; isCurrent: boolean }) {
  const className = joinClassNames(item.isMonospace && styles.monospace);
  if (isCurrent || !item.onSelect) {
    return (
      <span
        aria-current={isCurrent ? "page" : undefined}
        className={joinClassNames(className, styles.current)}
      >
        {item.label}
      </span>
    );
  }
  return (
    <button
      type="button"
      className={joinClassNames(className, styles.link)}
      onClick={item.onSelect}
    >
      {item.label}
    </button>
  );
}
