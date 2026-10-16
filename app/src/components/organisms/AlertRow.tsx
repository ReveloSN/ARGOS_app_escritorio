import { useCallback, useEffect, useRef, useState } from "react";

import { useI18n } from "../../i18n/i18nContext";
import { DecisionTag } from "../atoms/DecisionTag";
import { Icon } from "../atoms/Icon";
import { RiskTag } from "../atoms/RiskTag";
import { joinClassNames } from "../joinClassNames";
import { ActionMenu } from "../molecules/ActionMenu";
import type { AlertListProps, AlertRowData } from "./AlertList";
import styles from "./AlertList.module.css";

interface AlertRowProps extends Pick<AlertListProps, "onSelect" | "onHighlight" | "actionsFor"> {
  readonly row: AlertRowData;
  readonly isSelected: boolean;
}

export function AlertRow({ row, isSelected, onSelect, onHighlight, actionsFor }: AlertRowProps) {
  const { t } = useI18n();
  const element = useRef<HTMLTableRowElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);
  // La selección con J / K mueve también el foco, para que Enter abra la alerta elegida.
  useEffect(() => {
    if (isSelected && !element.current?.contains(document.activeElement)) element.current?.focus();
  }, [isSelected]);

  return (
    <tr
      ref={element}
      tabIndex={0}
      aria-selected={isSelected}
      className={joinClassNames(styles.row, isSelected && styles.selected)}
      onClick={() => {
        onSelect(row.id);
      }}
      onFocus={() => {
        onHighlight?.(row.id);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" && event.target === event.currentTarget) onSelect(row.id);
      }}
    >
      <td>
        <RiskTag level={row.risk} compact />
      </td>
      <td className={styles.number}>{row.number}</td>
      <td className={styles.alert}>
        <span className={styles.title}>{row.title}</span>
        <span className={styles.subtitle}>{row.subtitle}</span>
      </td>
      <td className={styles.value}>{row.valueA}</td>
      <td className={styles.value}>{row.valueB}</td>
      <td>
        <DecisionTag state={row.decision} />
      </td>
      <td
        className={styles.actionsCell}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        {actionsFor && (
          <button
            type="button"
            title={t("actions.rowActions")}
            aria-label={t("actions.rowActions")}
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            className={styles.actions}
            onClick={() => {
              setIsMenuOpen((current) => !current);
            }}
          >
            <Icon name="more_horiz" size="md" />
          </button>
        )}
        {isMenuOpen && actionsFor && (
          <ActionMenu
            label={t("actions.rowActions")}
            actions={actionsFor(row)}
            onClose={closeMenu}
          />
        )}
      </td>
    </tr>
  );
}
