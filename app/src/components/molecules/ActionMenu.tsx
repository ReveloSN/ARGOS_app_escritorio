import { useEffect, useRef, type KeyboardEvent } from "react";

import { Icon } from "../atoms/Icon";
import { joinClassNames } from "../joinClassNames";
import { useDismiss } from "../useDismiss";
import styles from "./ActionMenu.module.css";

export interface MenuAction {
  readonly id: string;
  readonly icon: string;
  readonly label: string;
  /** Tecla visible a la derecha («C», «↵»). */
  readonly shortcut?: string;
  /** Separa visualmente esta acción de las anteriores. */
  readonly startsGroup?: boolean;
  readonly isEmphasized?: boolean;
  readonly isMuted?: boolean;
  readonly onSelect: () => void;
}

interface ActionMenuProps {
  readonly label: string;
  readonly actions: readonly MenuAction[];
  readonly onClose: () => void;
}

const MOVES: Readonly<Record<string, number>> = { ArrowDown: 1, ArrowUp: -1 };

/** Menú inline «⋯» de los mockups: decide sin abrir el detalle, todo operable con teclado. */
export function ActionMenu({ label, actions, onClose }: ActionMenuProps) {
  const menu = useRef<HTMLDivElement>(null);
  useDismiss(menu, onClose);
  useEffect(() => {
    menu.current?.querySelector("button")?.focus();
  }, []);

  const moveFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = MOVES[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const items = [...(menu.current?.querySelectorAll("button") ?? [])];
    const current = items.findIndex((item) => item === document.activeElement);
    items[(current + step + items.length) % items.length]?.focus();
  };
  return (
    <div ref={menu} role="menu" aria-label={label} className={styles.menu} onKeyDown={moveFocus}>
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          role="menuitem"
          className={joinClassNames(
            styles.item,
            action.startsGroup && styles.groupStart,
            action.isEmphasized && styles.emphasized,
            action.isMuted && styles.muted,
          )}
          onClick={() => {
            onClose();
            action.onSelect();
          }}
        >
          <Icon name={action.icon} size="sm" />
          <span className={styles.label}>{action.label}</span>
          {action.shortcut && <span className={styles.shortcut}>{action.shortcut}</span>}
        </button>
      ))}
    </div>
  );
}
