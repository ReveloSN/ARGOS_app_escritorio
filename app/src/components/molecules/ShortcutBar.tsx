import { useI18n } from "../../i18n/i18nContext";
import { Kbd } from "../atoms/Kbd";
import styles from "./ShortcutBar.module.css";

export interface ShortcutHint {
  readonly keys: readonly string[];
  readonly label: string;
}

interface ShortcutBarProps {
  readonly hints: readonly ShortcutHint[];
}

/** Atajos visibles al pie de la vista (CLAUDE.md §9: todo operable con teclado). */
export function ShortcutBar({ hints }: ShortcutBarProps) {
  const { t } = useI18n();
  return (
    <footer aria-label={t("shortcuts.barLabel")} className={styles.bar}>
      {hints.map((hint) => (
        <span key={hint.label} className={styles.hint}>
          <Kbd keys={hint.keys} variant="inline" />
          {hint.label}
        </span>
      ))}
    </footer>
  );
}
