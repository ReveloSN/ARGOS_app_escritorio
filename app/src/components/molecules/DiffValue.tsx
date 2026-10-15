import { joinClassNames } from "../joinClassNames";
import styles from "./DiffValue.module.css";

interface DiffValueProps {
  readonly value: string;
  /** Posiciones distintas (base 1), tal como las calcula el motor. */
  readonly positions: readonly number[];
  readonly size?: "md" | "lg";
}

// Los caracteres distintos se resaltan y además se subrayan: la diferencia no depende del color.
export function DiffValue({ value, positions, size = "lg" }: DiffValueProps) {
  const differing = new Set(positions);
  // El motor cuenta posiciones por punto de código (índices de Python); Array.from divide igual.
  const characters = Array.from(value);

  return (
    <span className={joinClassNames(styles.value, styles[size])}>
      {characters.map((character, index) => {
        const key = `${String(index)}-${character}`;
        return differing.has(index + 1) ? (
          <mark key={key} className={styles.differs}>
            {character}
          </mark>
        ) : (
          <span key={key} className={styles.same}>
            {character}
          </span>
        );
      })}
    </span>
  );
}
