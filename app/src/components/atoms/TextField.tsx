import { useEffect, useId, useRef, type ReactNode } from "react";

import { Icon } from "./Icon";
import styles from "./TextField.module.css";

interface TextFieldProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly error?: string | undefined;
  /** Para qué sirve el campo; se anuncia junto a él. */
  readonly hint?: string;
  /** Texto visible junto a la etiqueta («obligatorio»); el lector lo recibe como aria-required. */
  readonly requiredMark?: string;
  /** Dentro de un diálogo: el foco entra al abrirlo y el texto actual queda seleccionado. */
  readonly autoFocus?: boolean;
  /** `password` para contraseñas; cualquier otro tipo es texto. */
  readonly type?: "text" | "password" | "email";
  /** Pista para el gestor de contraseñas y el teclado: «username», «new-password», «one-time-code». */
  readonly autoComplete?: string;
  readonly inputMode?: "text" | "numeric" | "email";
  /** Un control junto al campo (mostrar u ocultar la contraseña). */
  readonly trailing?: ReactNode;
}

interface FieldHeadingProps {
  readonly inputId: string;
  readonly hintId: string;
  readonly label: string;
  readonly hint?: string | undefined;
  readonly requiredMark?: string | undefined;
}

/** Etiqueta, marca de obligatorio y ayuda: lo que el usuario lee antes de escribir. */
function FieldHeading({ inputId, hintId, label, hint, requiredMark }: FieldHeadingProps) {
  return (
    <>
      <span className={styles.labelRow}>
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
        {requiredMark && (
          <span aria-hidden="true" className={styles.requiredMark}>
            {requiredMark}
          </span>
        )}
      </span>
      {hint && (
        <span id={hintId} className={styles.hint}>
          {hint}
        </span>
      )}
    </>
  );
}

function describedByOf(ids: readonly (string | false | undefined)[]): string | undefined {
  const joined = ids.filter(Boolean).join(" ");
  return joined || undefined;
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  error,
  hint,
  requiredMark,
  autoFocus = false,
  type,
  autoComplete,
  inputMode,
  trailing,
}: TextFieldProps) {
  const inputId = useId();
  const errorId = useId();
  const hintId = useId();
  const describedBy = describedByOf([hint && hintId, error && errorId]);
  const input = useRef<HTMLInputElement>(null);
  // Al aparecer un error el foco va al campo: es lo que hay que corregir y se anuncia ahí.
  useEffect(() => {
    if (error) input.current?.focus();
  }, [error]);

  return (
    <div className={styles.field}>
      <FieldHeading
        inputId={inputId}
        hintId={hintId}
        label={label}
        hint={hint}
        requiredMark={requiredMark}
      />
      <div className={styles.control}>
        <input
          ref={input}
          id={inputId}
          className={styles.input}
          type={type}
          autoComplete={autoComplete}
          inputMode={inputMode}
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
          aria-required={requiredMark ? true : undefined}
          aria-describedby={describedBy}
          onChange={(event) => {
            onChange(event.target.value);
          }}
        />
        {trailing}
      </div>
      {error && (
        <span id={errorId} role="alert" className={styles.error}>
          <Icon name="report" size="xs" />
          {error}
        </span>
      )}
    </div>
  );
}
