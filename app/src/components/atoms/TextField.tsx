import { useEffect, useId, useRef } from "react";

import { Icon } from "./Icon";
import styles from "./TextField.module.css";

interface TextFieldProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly error?: string;
  /** Dentro de un diálogo: el foco entra al abrirlo y el texto actual queda seleccionado. */
  readonly autoFocus?: boolean;
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  error,
  autoFocus = false,
}: TextFieldProps) {
  const inputId = useId();
  const errorId = useId();
  const input = useRef<HTMLInputElement>(null);
  // Al aparecer un error el foco va al campo: es lo que hay que corregir y se anuncia ahí.
  useEffect(() => {
    if (error) input.current?.focus();
  }, [error]);

  return (
    <div className={styles.field}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <input
        ref={input}
        id={inputId}
        className={styles.input}
        value={value}
        autoFocus={autoFocus}
        onFocus={
          autoFocus
            ? (event) => {
                event.target.select();
              }
            : undefined
        }
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
      {error && (
        <span id={errorId} role="alert" className={styles.error}>
          <Icon name="report" size="xs" />
          {error}
        </span>
      )}
    </div>
  );
}
