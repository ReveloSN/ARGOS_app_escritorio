import { joinClassNames } from "../joinClassNames";
import styles from "./DiffValue.module.css";

interface DiffValueProps {
  readonly value: string;
  /** Posiciones distintas (base 1), tal como las calcula el motor. */
  readonly positions: readonly number[];
  /** Sin tamaño, los valores largos (una fecha escrita) usan el menor para caber en su tarjeta. */
  readonly size?: "md" | "lg";
}

const LONG_VALUE_LENGTH = 12;
const WORD_SEPARATOR = " ";

interface PositionedCharacter {
  readonly character: string;
  /** Posición base 1, la misma que usa el motor. */
  readonly position: number;
}

// Cada palabra (con su espacio final) es una unidad: si el valor no cabe, la línea se corta entre palabras.
function groupByWord(characters: readonly string[]): readonly (readonly PositionedCharacter[])[] {
  const words: PositionedCharacter[][] = [];
  let current: PositionedCharacter[] = [];
  characters.forEach((character, index) => {
    current.push({ character, position: index + 1 });
    if (character !== WORD_SEPARATOR) return;
    words.push(current);
    current = [];
  });
  if (current.length > 0) words.push(current);
  return words;
}

// Los caracteres distintos se resaltan y además se subrayan: la diferencia no depende del color.
export function DiffValue({ value, positions, size }: DiffValueProps) {
  const differing = new Set(positions);
  // El motor cuenta posiciones por punto de código (índices de Python); Array.from divide igual.
  const characters = Array.from(value);
  const resolvedSize = size ?? (characters.length > LONG_VALUE_LENGTH ? "md" : "lg");

  return (
    <span className={joinClassNames(styles.value, styles[resolvedSize])}>
      {groupByWord(characters).map((word) => (
        <span key={word[0]?.position} className={styles.word}>
          {word.map(({ character, position }) =>
            differing.has(position) ? (
              <mark key={position} className={styles.differs}>
                {character}
              </mark>
            ) : (
              <span key={position} className={styles.same}>
                {character}
              </span>
            ),
          )}
        </span>
      ))}
    </span>
  );
}
