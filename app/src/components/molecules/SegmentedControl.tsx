import { joinClassNames } from "../joinClassNames";
import styles from "./SegmentedControl.module.css";

export interface SegmentOption {
  readonly value: string;
  readonly label: string;
}

interface SegmentedControlProps {
  readonly label: string;
  readonly options: readonly SegmentOption[];
  readonly value: string;
  readonly onChange: (value: string) => void;
}

/** Opciones excluyentes en una sola pieza («Estricta · Equilibrada · Permisiva»). */
export function SegmentedControl({ label, options, value, onChange }: SegmentedControlProps) {
  return (
    <div role="radiogroup" aria-label={label} className={styles.group}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          className={joinClassNames(styles.option, option.value === value && styles.selected)}
          onClick={() => {
            onChange(option.value);
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
