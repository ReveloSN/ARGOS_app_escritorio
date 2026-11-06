import type { KeyboardEvent } from "react";

import { joinClassNames } from "../joinClassNames";
import styles from "./Tabs.module.css";

export interface TabItem {
  readonly id: string;
  readonly label: string;
  readonly count?: number;
}

interface TabsProps {
  readonly label: string;
  readonly tabs: readonly TabItem[];
  readonly selectedId: string;
  readonly onSelect: (id: string) => void;
}

/** A qué pestaña lleva cada tecla: vecinas con las flechas (dando la vuelta), extremos con Inicio y Fin. */
function targetIndex(key: string, current: number, count: number): number | undefined {
  const targets: Readonly<Record<string, number>> = {
    ArrowRight: (current + 1) % count,
    ArrowLeft: (current - 1 + count) % count,
    Home: 0,
    End: count - 1,
  };
  return targets[key];
}

export function Tabs({ label, tabs, selectedId, onSelect }: TabsProps) {
  const selectedIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.id === selectedId),
  );
  const move = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = targetIndex(event.key, selectedIndex, tabs.length);
    const tab = next === undefined ? undefined : tabs[next];
    if (!tab) return;
    event.preventDefault();
    onSelect(tab.id);
    event.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]')[next ?? 0]?.focus();
  };
  return (
    <div role="tablist" aria-label={label} className={styles.tabs} onKeyDown={move}>
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          title={tab.label}
          aria-selected={tab.id === selectedId}
          tabIndex={index === selectedIndex ? 0 : -1}
          className={joinClassNames(styles.tab, tab.id === selectedId && styles.selected)}
          onClick={() => {
            onSelect(tab.id);
          }}
        >
          <span className={styles.label}>{tab.label}</span>
          {tab.count !== undefined && <span className={styles.count}>{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}
