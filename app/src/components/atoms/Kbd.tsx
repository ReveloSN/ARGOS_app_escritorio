import { useI18n } from "../../i18n/i18nContext";
import { joinClassNames } from "../joinClassNames";
import styles from "./Kbd.module.css";

/** Marcador del modificador principal: Ctrl en Windows y Linux, ⌘ en macOS. */
export const MODIFIER_KEY = "mod";

const MAC_PLATFORM = /Mac/i;

interface KbdProps {
  /** Teclas del atajo, p. ej. ["mod", "K"]. Los nombres de tecla no se traducen. */
  readonly keys: readonly string[];
  readonly variant?: "boxed" | "inline";
}

export function Kbd({ keys, variant = "boxed" }: KbdProps) {
  const { t } = useI18n();
  const modifier = MAC_PLATFORM.test(navigator.userAgent)
    ? t("shortcuts.command")
    : t("shortcuts.control");
  const label = keys.map((key) => (key === MODIFIER_KEY ? modifier : key)).join(" ");

  return <kbd className={joinClassNames(styles.kbd, styles[variant])}>{label}</kbd>;
}
