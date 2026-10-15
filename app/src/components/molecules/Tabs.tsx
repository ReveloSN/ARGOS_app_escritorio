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

export function Tabs({ label, tabs, selectedId, onSelect }: TabsProps) {
  return (
    <div role="tablist" aria-label={label} className={styles.tabs}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          title={tab.label}
          aria-selected={tab.id === selectedId}
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
