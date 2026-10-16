import { Icon } from "../atoms/Icon";
import styles from "./SelectField.module.css";

export interface SelectOption {
  readonly value: string;
  readonly label: string;
}

interface SelectFieldProps {
  readonly label: string;
  readonly value: string;
  readonly options: readonly SelectOption[];
  readonly onChange: (value: string) => void;
  /** «Periodo: últimos 30 días»: la etiqueta va dentro del control, no encima. */
  readonly isCompact?: boolean;
}

/** Lista desplegable nativa: accesible con teclado y lector de pantalla sin código extra. */
export function SelectField({
  label,
  value,
  options,
  onChange,
  isCompact = false,
}: SelectFieldProps) {
  const select = (
    <span className={isCompact ? styles.compactControl : styles.control}>
      <select
        aria-label={label}
        className={styles.select}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Icon name="expand_more" size="md" className={styles.icon} />
    </span>
  );
  if (isCompact) return select;
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      {select}
    </label>
  );
}
