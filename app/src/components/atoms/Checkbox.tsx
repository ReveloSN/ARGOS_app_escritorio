import styles from "./Checkbox.module.css";
import { Icon } from "./Icon";

interface CheckboxProps {
  readonly label: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
}

export function Checkbox({ label, checked, onChange }: CheckboxProps) {
  return (
    <label className={styles.checkbox}>
      <input
        type="checkbox"
        className={styles.input}
        checked={checked}
        onChange={(event) => {
          onChange(event.target.checked);
        }}
      />
      <span className={styles.box}>{checked && <Icon name="check" size="xs" />}</span>
      {label}
    </label>
  );
}
