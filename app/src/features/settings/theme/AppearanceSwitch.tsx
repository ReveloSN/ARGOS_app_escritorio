import { joinClassNames } from "../../../components/joinClassNames";
import { useI18n } from "../../../i18n/i18nContext";
import type { TranslationKey } from "../../../i18n/translate";
import styles from "./AppearanceSwitch.module.css";
import type { ThemePreference } from "./resolveTheme";
import { useTheme } from "./themeContext";

const OPTIONS: readonly { readonly value: ThemePreference; readonly label: TranslationKey }[] = [
  { value: "light", label: "appearance.light" },
  { value: "dark", label: "appearance.dark" },
  { value: "system", label: "appearance.system" },
];

interface AppearanceSwitchProps {
  /** Se avisa después de cambiar el tema (para la confirmación «Se guardaron los cambios»). */
  readonly onChange?: () => void;
}

/** Ajustes > Apariencia de los mockups: claro, oscuro o según el sistema. */
export function AppearanceSwitch({ onChange }: AppearanceSwitchProps) {
  const { t } = useI18n();
  const { preference, setPreference } = useTheme();

  return (
    <div role="radiogroup" aria-label={t("appearance.label")} className={styles.group}>
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={preference === option.value}
          className={joinClassNames(styles.option, preference === option.value && styles.selected)}
          onClick={() => {
            setPreference(option.value);
            onChange?.();
          }}
        >
          <span className={styles.dot} />
          {t(option.label)}
        </button>
      ))}
    </div>
  );
}
