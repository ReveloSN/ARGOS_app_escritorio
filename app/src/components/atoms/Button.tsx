import type { ReactNode } from "react";

import { joinClassNames } from "../joinClassNames";
import styles from "./Button.module.css";
import { Icon } from "./Icon";
import { Kbd } from "./Kbd";

export type ButtonVariant = "primary" | "secondary" | "tertiary";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  readonly children: ReactNode;
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly icon?: string;
  /** Atajo visible junto a la etiqueta (CLAUDE.md §9: atajos visibles). */
  readonly shortcut?: readonly string[];
  readonly disabled?: boolean;
  /** Para la acción principal de un diálogo: Enter la activa al abrirlo. */
  readonly autoFocus?: boolean;
  readonly onClick?: () => void;
  /** Cuando varios botones dicen lo mismo («Abrir») y el nombre debe aclarar sobre qué actúan. */
  readonly ariaLabel?: string;
}

// Ancho mínimo y padding flexible: el texto traducido puede crecer sin cortarse.
export function Button({
  children,
  variant = "secondary",
  size = "lg",
  icon,
  shortcut,
  disabled = false,
  autoFocus = false,
  onClick,
  ariaLabel,
}: ButtonProps) {
  return (
    <button
      type="button"
      className={joinClassNames(styles.button, styles[variant], styles[size])}
      disabled={disabled}
      aria-label={ariaLabel}
      autoFocus={autoFocus}
      onClick={onClick}
    >
      {icon && <Icon name={icon} size="sm" />}
      <span className={styles.label}>{children}</span>
      {shortcut && <Kbd keys={shortcut} variant="inline" />}
    </button>
  );
}
