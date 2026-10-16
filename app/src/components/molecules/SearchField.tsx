import type { Ref } from "react";

import { useI18n } from "../../i18n/i18nContext";
import { Icon } from "../atoms/Icon";
import styles from "./SearchField.module.css";

interface SearchFieldProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onSearch: (value: string) => void;
  /** Tecla que enfoca el campo («/»), visible dentro de él. */
  readonly shortcutHint?: string;
  readonly inputRef?: Ref<HTMLInputElement>;
}

export function SearchField({
  label,
  value,
  onChange,
  onSearch,
  shortcutHint,
  inputRef,
}: SearchFieldProps) {
  const { t } = useI18n();

  return (
    <form
      role="search"
      className={styles.search}
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(value);
      }}
    >
      <span className={styles.field}>
        <Icon name="search" size="sm" />
        <input
          ref={inputRef}
          className={styles.input}
          aria-label={label}
          placeholder={label}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
          }}
        />
        {value ? (
          <button
            type="button"
            className={styles.clear}
            aria-label={t("actions.clearSearch")}
            onClick={() => {
              onChange("");
            }}
          >
            <Icon name="close" size="sm" />
          </button>
        ) : (
          shortcutHint && <kbd className={styles.hint}>{shortcutHint}</kbd>
        )}
      </span>
      <button type="submit" className={styles.submit}>
        {t("actions.search")}
      </button>
    </form>
  );
}
