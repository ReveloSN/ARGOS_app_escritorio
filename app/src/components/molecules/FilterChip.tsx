import { useI18n } from "../../i18n/i18nContext";
import { Icon } from "../atoms/Icon";
import { joinClassNames } from "../joinClassNames";
import styles from "./FilterChip.module.css";

interface FilterChipProps {
  readonly label: string;
  readonly active?: boolean;
  readonly onRemove?: () => void;
  readonly onOpen?: () => void;
}

/** Filtro combinable (búsqueda faceted): activo se quita con ×, inactivo abre sus opciones. */
export function FilterChip({ label, active = false, onRemove, onOpen }: FilterChipProps) {
  const { t } = useI18n();

  if (!active) {
    return (
      <button type="button" className={styles.chip} onClick={onOpen}>
        {label}
        <Icon name="expand_more" size="sm" />
      </button>
    );
  }
  return (
    <span className={joinClassNames(styles.chip, styles.active)}>
      {onOpen ? (
        <button type="button" className={styles.open} onClick={onOpen}>
          {label}
        </button>
      ) : (
        label
      )}
      <button
        type="button"
        className={styles.remove}
        aria-label={`${t("actions.removeFilter")}: ${label}`}
        onClick={onRemove}
      >
        <Icon name="close" size="sm" />
      </button>
    </span>
  );
}
