import type { ReactNode } from "react";

import { joinClassNames } from "../joinClassNames";
import styles from "./DiffMark.module.css";

export type DiffMarkKind = "removed" | "added" | "changed";

// Elementos semánticos: los lectores de pantalla anuncian «eliminado» e «insertado».
const ELEMENT_BY_KIND = { removed: "del", added: "ins", changed: "mark" } as const;

interface DiffMarkProps {
  readonly kind: DiffMarkKind;
  readonly children: ReactNode;
  readonly isSelected?: boolean;
}

/**
 * Diferencia dentro del texto: tachado (falta), subrayado (agregado) o borde punteado
 * (cambiado). La forma comunica el tipo aunque no se distinga el color.
 */
export function DiffMark({ kind, children, isSelected = false }: DiffMarkProps) {
  const Element = ELEMENT_BY_KIND[kind];
  return (
    <Element
      data-selected={isSelected}
      className={joinClassNames(styles.mark, styles[kind], isSelected && styles.selected)}
    >
      {children}
    </Element>
  );
}
