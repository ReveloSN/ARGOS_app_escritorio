import type { KeyboardEvent } from "react";

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

const STEP_BY_KEY: Readonly<Record<string, number>> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
};

const NOT_FOUND = -1;

/** Índice de destino para la tecla, o `undefined` si la tecla no mueve la elección. */
function targetIndex(key: string, current: number, count: number): number | undefined {
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  const step = STEP_BY_KEY[key];
  if (step === undefined) return undefined;
  // Sin opción elegida, avanzar entra por la primera y retroceder por la última.
  if (current === NOT_FOUND) return step > 0 ? 0 : count - 1;
  return (current + step + count) % count;
}

/** Opciones excluyentes en una sola pieza («Estricta · Equilibrada · Permisiva»). */
export function SegmentedControl({ label, options, value, onChange }: SegmentedControlProps) {
  const selectedIndex = options.findIndex((option) => option.value === value);
  // Si el valor no coincide con ninguna opción, la primera conserva la parada de Tab.
  const tabStopIndex = selectedIndex === NOT_FOUND ? 0 : selectedIndex;
  // Un grupo de radios es una sola parada de Tab: las flechas eligen y mueven el foco.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = targetIndex(event.key, selectedIndex, options.length);
    const next = index === undefined ? undefined : options[index];
    if (!next) return;
    event.preventDefault();
    onChange(next.value);
    const radios = event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]');
    radios[index ?? 0]?.focus();
  };
  return (
    <div role="radiogroup" aria-label={label} className={styles.group} onKeyDown={onKeyDown}>
      {options.map((option, index) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={index === selectedIndex}
          tabIndex={index === tabStopIndex ? 0 : -1}
          className={joinClassNames(styles.option, index === selectedIndex && styles.selected)}
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
