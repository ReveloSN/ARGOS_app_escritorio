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

/** Opciones excluyentes en una sola pieza («Estricta · Equilibrada · Permisiva»). */
export function SegmentedControl({ label, options, value, onChange }: SegmentedControlProps) {
  // Un grupo de radios es una sola parada de Tab: las flechas eligen y mueven el foco.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = STEP_BY_KEY[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const index = options.findIndex((option) => option.value === value);
    const next = options[(index + step + options.length) % options.length];
    if (!next) return;
    onChange(next.value);
    const radios = event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]');
    radios[options.indexOf(next)]?.focus();
  };
  return (
    <div role="radiogroup" aria-label={label} className={styles.group} onKeyDown={onKeyDown}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          tabIndex={option.value === value ? 0 : -1}
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
