import styles from "./BrandMark.module.css";

export function BrandMark() {
  return (
    <span aria-hidden="true" className={styles.mark}>
      <span className={styles.dot} />
    </span>
  );
}
