import styles from "./Toggle.module.css";

interface ToggleProps {
  readonly label: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
}

export function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={styles.toggle}
      onClick={() => {
        onChange(!checked);
      }}
    >
      <span className={styles.track}>
        <span className={styles.thumb} />
      </span>
      <span>{label}</span>
    </button>
  );
}
