import styles from "./HighlightedExcerpt.module.css";

interface HighlightedExcerptProps {
  readonly excerpt: string;
  /** El valor comparado: se marca donde aparece dentro del fragmento citado. */
  readonly value: string;
}

/**
 * El fragmento de origen con el valor marcado (fondo y subrayado, no solo color). Si el
 * fragmento no lo contiene literalmente, se muestra sin marcar: nunca se inventa la posición.
 */
export function HighlightedExcerpt({ excerpt, value }: HighlightedExcerptProps) {
  const start = value ? excerpt.indexOf(value) : -1;
  if (start < 0) return <>{excerpt}</>;
  const end = start + value.length;
  return (
    <>
      {excerpt.slice(0, start)}
      <mark className={styles.mark}>{excerpt.slice(start, end)}</mark>
      {excerpt.slice(end)}
    </>
  );
}
