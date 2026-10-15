import { useI18n } from "../../i18n/i18nContext";
import type { TranslationKey } from "../../i18n/translate";
import { DecisionTag, type DecisionState } from "../atoms/DecisionTag";
import { Icon } from "../atoms/Icon";
import { RiskTag, type RiskLevel } from "../atoms/RiskTag";
import { joinClassNames } from "../joinClassNames";
import styles from "./AlertList.module.css";

export interface AlertRowData {
  readonly id: string;
  readonly number: number;
  readonly risk: RiskLevel;
  readonly title: string;
  readonly subtitle: string;
  readonly valueA: string;
  readonly valueB: string;
  readonly decision: DecisionState;
}

// Anchos de columna del mockup de Resultados; la columna «Alerta» toma el espacio restante.
const COLUMNS: readonly { readonly label: TranslationKey; readonly width?: string | undefined }[] =
  [
    { label: "alerts.columns.risk", width: styles.riskColumn },
    { label: "alerts.columns.number", width: styles.numberColumn },
    { label: "alerts.columns.alert" },
    { label: "alerts.columns.valueA", width: styles.valueColumn },
    { label: "alerts.columns.valueB", width: styles.valueColumn },
    { label: "alerts.columns.state", width: styles.stateColumn },
  ];

interface AlertListProps {
  readonly rows: readonly AlertRowData[];
  readonly selectedId?: string;
  readonly onSelect: (id: string) => void;
  readonly onOpenActions?: ((id: string) => void) | undefined;
}

export function AlertList({ rows, selectedId, onSelect, onOpenActions }: AlertListProps) {
  const { t } = useI18n();
  return (
    <table aria-label={t("alerts.listLabel")} className={styles.table}>
      <colgroup>
        {COLUMNS.map((column) => (
          <col key={column.label} className={column.width} />
        ))}
        <col className={styles.actionsColumn} />
      </colgroup>
      <thead>
        <tr className={styles.header}>
          {COLUMNS.map((column) => (
            <th key={column.label} scope="col">
              {t(column.label)}
            </th>
          ))}
          <th scope="col">
            <span className="visually-hidden">{t("actions.rowActions")}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <AlertRow
            key={row.id}
            row={row}
            isSelected={row.id === selectedId}
            {...{ onSelect, onOpenActions }}
          />
        ))}
      </tbody>
    </table>
  );
}

interface AlertRowProps extends Pick<AlertListProps, "onSelect" | "onOpenActions"> {
  readonly row: AlertRowData;
  readonly isSelected: boolean;
}

function AlertRow({ row, isSelected, onSelect, onOpenActions }: AlertRowProps) {
  const { t } = useI18n();
  return (
    <tr
      tabIndex={0}
      aria-selected={isSelected}
      className={joinClassNames(styles.row, isSelected && styles.selected)}
      onClick={() => {
        onSelect(row.id);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") onSelect(row.id);
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
      <td>
        <button
          type="button"
          title={t("actions.rowActions")}
          aria-label={t("actions.rowActions")}
          className={styles.actions}
          onClick={(event) => {
            event.stopPropagation();
            onOpenActions?.(row.id);
          }}
        >
          <Icon name="more_horiz" size="md" />
        </button>
      </td>
    </tr>
  );
}
