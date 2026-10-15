import styles from "./ProgressBar.module.css";

const PERCENT = 100;

interface ProgressBarProps {
  /** Avance entre 0 y 1. */
  readonly value: number;
  readonly label: string;
}

export function ProgressBar({ value, label }: ProgressBarProps) {
  const percent = Math.round(Math.min(Math.max(value, 0), 1) * PERCENT);

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={PERCENT}
      aria-valuenow={percent}
      className={styles.track}
    >
      <div className={styles.fill} style={{ inlineSize: `${String(percent)}%` }} />
    </div>
  );
}
