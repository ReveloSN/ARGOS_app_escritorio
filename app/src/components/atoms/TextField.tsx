import { useId } from "react";

import { Icon } from "./Icon";
import styles from "./TextField.module.css";

interface TextFieldProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly error?: string;
}

export function TextField({ label, value, onChange, placeholder, error }: TextFieldProps) {
  const inputId = useId();
  const errorId = useId();

  return (
    <div className={styles.field}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <input
        id={inputId}
        className={styles.input}
        value={value}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
      {error && (
        <span id={errorId} className={styles.error}>
          <Icon name="report" size="xs" />
          {error}
        </span>
      )}
    </div>
  );
}
