import { useI18n } from "../../i18n/i18nContext";
import type { TranslationKey } from "../../i18n/translate";
import { Icon } from "../atoms/Icon";
import { joinClassNames } from "../joinClassNames";
import styles from "./SessionHistoryTable.module.css";

export interface SessionRowView {
  readonly id: string;
  readonly name: string;
  /** Fecha ya formateada. */
  readonly date: string;
  readonly files: number;
  readonly alerts: number;
  /** «2 de 9», o «—» si la sesión no tuvo alertas. */
  readonly decided: string;
  readonly statusIcon: string;
  readonly statusLabel: string;
}

// Anchos del mockup de Historial; la columna «Sesión» toma el espacio restante.
const COLUMNS: readonly { readonly label: TranslationKey; readonly width?: string | undefined }[] =
  [
    { label: "history.columns.session" },
    { label: "history.columns.date", width: styles.dateColumn },
    { label: "history.columns.files", width: styles.countColumn },
    { label: "history.columns.alerts", width: styles.countColumn },
    { label: "history.columns.decided", width: styles.decidedColumn },
    { label: "history.columns.status", width: styles.statusColumn },
  ];

interface SessionHistoryTableProps {
  readonly rows: readonly SessionRowView[];
  readonly selectedId: string | undefined;
  readonly onSelect: (id: string) => void;
  /** Enter o doble clic: abre la revisión. */
  readonly onOpen: (id: string) => void;
}

/** Sesiones del historial; la seleccionada muestra sus decisiones en el panel lateral. */
export function SessionHistoryTable({
  rows,
  selectedId,
  onSelect,
  onOpen,
}: SessionHistoryTableProps) {
  const { t } = useI18n();
  return (
    <table aria-label={t("history.tableLabel")} className={styles.table}>
      <colgroup>
        {COLUMNS.map((column) => (
          <col key={column.label} className={column.width} />
        ))}
      </colgroup>
      <thead>
        <tr className={styles.header}>
          {COLUMNS.map((column) => (
            <th key={column.label} scope="col">
              {t(column.label)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.id}
            tabIndex={0}
            aria-selected={row.id === selectedId}
            className={joinClassNames(styles.row, row.id === selectedId && styles.selected)}
            onClick={() => {
              onSelect(row.id);
            }}
            onDoubleClick={() => {
              onOpen(row.id);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") onOpen(row.id);
            }}
          >
            <td title={row.name} className={styles.name}>
              {row.name}
            </td>
            <td className={styles.mono}>{row.date}</td>
            <td className={styles.mono}>{row.files}</td>
            <td className={styles.mono}>{row.alerts}</td>
            <td className={styles.mono}>{row.decided}</td>
            <td className={styles.status}>
              <span className={styles.statusContent}>
                <Icon name={row.statusIcon} size="sm" />
                {row.statusLabel}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
