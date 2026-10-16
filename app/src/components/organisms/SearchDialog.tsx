import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { useI18n } from "../../i18n/i18nContext";
import { Icon } from "../atoms/Icon";
import { joinClassNames } from "../joinClassNames";
import { useDismiss } from "../useDismiss";
import styles from "./SearchDialog.module.css";

export interface SearchExcerpt {
  readonly text: string;
  readonly highlightStart: number;
  readonly highlightEnd: number;
}

export interface SearchItem {
  readonly id: string;
  readonly title: string;
  readonly detail?: string;
  readonly excerpt?: SearchExcerpt;
}

export interface SearchGroup {
  readonly id: string;
  readonly label: string;
  readonly items: readonly SearchItem[];
}

interface SearchDialogProps {
  readonly placeholder: string;
  readonly query: string;
  readonly groups: readonly SearchGroup[];
  /** Mensaje cuando no hay resultados que mostrar («Buscando…», «Sin resultados…»). */
  readonly status?: string | undefined;
  readonly onQueryChange: (query: string) => void;
  readonly onSelect: (item: SearchItem) => void;
  readonly onClose: () => void;
}

const MOVES: Readonly<Record<string, number>> = { ArrowDown: 1, ArrowUp: -1 };

/** Búsqueda global (Ctrl K): resultados agrupados, se recorren con ↑ ↓ y se abren con Enter. */
export function SearchDialog(props: SearchDialogProps) {
  const { t } = useI18n();
  const dialog = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const items = props.groups.flatMap((group) => group.items);
  useDismiss(dialog, props.onClose);
  useEffect(() => {
    setActive(0);
  }, [props.groups]);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const step = MOVES[event.key];
    if (step !== undefined && items.length > 0) {
      event.preventDefault();
      setActive((current) => (current + step + items.length) % items.length);
    }
    const item = items[active];
    if (event.key === "Enter" && item) props.onSelect(item);
  };
  const activeId = items[active]?.id;
  return (
    <div className={styles.backdrop}>
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label={props.placeholder}
        className={styles.dialog}
      >
        <label className={styles.field}>
          <Icon name="search" size="md" />
          <input
            // El diálogo se abre para escribir: el foco va directo al campo.
            autoFocus
            role="combobox"
            aria-expanded={items.length > 0}
            aria-controls="search-results"
            aria-activedescendant={activeId && `search-${activeId}`}
            aria-label={props.placeholder}
            placeholder={props.placeholder}
            className={styles.input}
            value={props.query}
            onChange={(event) => {
              props.onQueryChange(event.target.value);
            }}
            onKeyDown={onKeyDown}
          />
          <kbd className={styles.escape}>{t("search.escape")}</kbd>
        </label>
        <div
          id="search-results"
          role="listbox"
          aria-label={t("search.results")}
          className={styles.results}
        >
          {props.status && <p className={styles.status}>{props.status}</p>}
          {props.groups.map((group) => (
            <div key={group.id} role="group" aria-label={group.label}>
              <span className={styles.groupLabel}>{group.label}</span>
              {group.items.map((item) => (
                <div
                  key={item.id}
                  id={`search-${item.id}`}
                  role="option"
                  aria-selected={item.id === activeId}
                  className={joinClassNames(styles.item, item.id === activeId && styles.active)}
                  onClick={() => {
                    props.onSelect(item);
                  }}
                  onMouseEnter={() => {
                    setActive(items.indexOf(item));
                  }}
                >
                  <span className={styles.itemTitle}>{item.title}</span>
                  {item.detail && <span className={styles.itemDetail}>{item.detail}</span>}
                  {item.excerpt && <Excerpt excerpt={item.excerpt} />}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Excerpt({ excerpt }: { excerpt: SearchExcerpt }) {
  const { text, highlightStart, highlightEnd } = excerpt;
  return (
    <span className={styles.excerpt}>
      {text.slice(0, highlightStart)}
      <mark className={styles.mark}>{text.slice(highlightStart, highlightEnd)}</mark>
      {text.slice(highlightEnd)}
    </span>
  );
}
