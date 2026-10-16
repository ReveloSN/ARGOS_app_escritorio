import { Kbd, MODIFIER_KEY } from "../../components/atoms/Kbd";
import { useI18n } from "../../i18n/i18nContext";
import type { TranslationKey } from "../../i18n/translate";
import styles from "./Settings.module.css";

// Los atajos de los mockups; los nombres de tecla no se traducen.
const SHORTCUTS: readonly { readonly keys: readonly string[]; readonly label: TranslationKey }[] = [
  { keys: [MODIFIER_KEY, "N"], label: "settings.shortcuts.newReview" },
  { keys: [MODIFIER_KEY, "K"], label: "settings.shortcuts.search" },
  { keys: [MODIFIER_KEY, "B"], label: "settings.shortcuts.sidebar" },
  { keys: ["J", "K"], label: "settings.shortcuts.move" },
  { keys: ["↵"], label: "settings.shortcuts.open" },
  { keys: ["C"], label: "settings.shortcuts.correct" },
  { keys: ["E"], label: "settings.shortcuts.error" },
  { keys: ["I"], label: "settings.shortcuts.ignore" },
  { keys: ["/"], label: "settings.shortcuts.searchAlerts" },
  { keys: [MODIFIER_KEY, "Z"], label: "settings.shortcuts.undo" },
];

/** Ajustes > Atajos de teclado: todo se puede hacer sin ratón (CLAUDE.md §9). */
export function ShortcutsSection() {
  const { t } = useI18n();
  return (
    <dl className={styles.shortcuts}>
      {SHORTCUTS.map((shortcut) => (
        <div key={shortcut.label} className={styles.shortcutRow}>
          <dt>
            <Kbd keys={shortcut.keys} />
          </dt>
          <dd>{t(shortcut.label)}</dd>
        </div>
      ))}
    </dl>
  );
}
