import { useEffect, useId, useRef, useState } from "react";

import { Icon } from "../../components/atoms/Icon";
import { Kbd } from "../../components/atoms/Kbd";
import { useI18n } from "../../i18n/i18nContext";
import { describeActiveOptions } from "./activeOptions";
import styles from "./Compare.module.css";
import { OptionsPanel, type OptionsPanelProps } from "./OptionsPanel";
import { useShortcuts } from "../keyboard/useShortcuts";

const OPTIONS_KEY = "o";
const FOCUSABLE = "input, select, button";

/** Esc cierra el panel antes que la comparación: se atiende primero y no llega a los demás. */
function useEscapeToClose(isOpen: boolean, close: () => void): void {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      close();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [isOpen, close]);
}

/** Al abrir el panel el foco entra en él; al cerrarlo vuelve al botón que lo abrió. */
function usePanelFocus() {
  const [isOpen, setIsOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isOpen) panel.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
  }, [isOpen]);
  const close = () => {
    setIsOpen(false);
    toggle.current?.focus();
  };
  const flip = () => {
    if (isOpen) close();
    else setIsOpen(true);
  };
  return { isOpen, toggle, panel, close, flip };
}

/** Lo secundario de Comparar, plegado: lo esencial queda a la vista. Se abre con «O». */
export function ComparisonOptions(props: OptionsPanelProps) {
  const { t } = useI18n();
  const panelId = useId();
  const { isOpen, toggle, panel, close, flip } = usePanelFocus();
  useEscapeToClose(isOpen, close);
  useShortcuts([{ key: OPTIONS_KEY, run: flip }]);
  const label = t("comparison.options.label");
  const active = describeActiveOptions(props.filters, t);
  return (
    <div className={styles.options}>
      <button
        ref={toggle}
        type="button"
        className={styles.optionsToggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-label={active ? `${label}, ${active}` : label}
        aria-keyshortcuts={OPTIONS_KEY}
        onClick={flip}
      >
        <Icon name={isOpen ? "expand_less" : "expand_more"} size="sm" />
        {label}
        {active && <span className={styles.optionsCount}>{active}</span>}
        <Kbd keys={[OPTIONS_KEY.toUpperCase()]} />
      </button>
      {isOpen && (
        <div id={panelId} ref={panel} className={styles.optionsPanel}>
          <OptionsPanel {...props} />
        </div>
      )}
    </div>
  );
}
