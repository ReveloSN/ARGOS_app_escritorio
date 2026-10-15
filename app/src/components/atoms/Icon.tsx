import { joinClassNames } from "../joinClassNames";
import styles from "./Icon.module.css";

export type IconSize = "xs" | "sm" | "md" | "lg" | "xl";

interface IconProps {
  /** Nombre del símbolo de Material Symbols (se empaqueta localmente, sin internet). */
  readonly name: string;
  readonly size?: IconSize;
  readonly className?: string | undefined;
}

// Siempre decorativo: el significado lo da el texto que lo acompaña (CLAUDE.md §9).
export function Icon({ name, size = "md", className }: IconProps) {
  return (
    <span
      aria-hidden="true"
      className={joinClassNames("material-symbols-outlined", styles.icon, styles[size], className)}
    >
      {name}
    </span>
  );
}
