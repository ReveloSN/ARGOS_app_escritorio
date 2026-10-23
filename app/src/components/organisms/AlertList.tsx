import { useI18n } from "../../i18n/i18nContext";
import type { TranslationKey } from "../../i18n/translate";
import type { DecisionState } from "../atoms/DecisionTag";
import type { RiskLevel } from "../atoms/RiskTag";
import type { MenuAction } from "../molecules/ActionMenu";
import styles from "./AlertList.module.css";
import { AlertRow } from "./AlertRow";

export interface AlertRowData {
  readonly id: string;
  readonly number: number;
  readonly risk: RiskLevel;
  readonly title: string;
  readonly subtitle: string;
  readonly valueA: string;
  readonly valueB: string;
  /** Verificación de un solo dato: sin Valor B ni «No alertar casos similares». */
  readonly isSingleValue?: boolean;
  readonly decision: DecisionState;
}

/** Un grupo de filas («Riesgo alto 3»); sin etiqueta, las filas van sin encabezado. */
export interface AlertGroup {
  readonly id: string;
  readonly label?: string;
  readonly rows: readonly AlertRowData[];
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

export interface AlertListProps {
  readonly groups: readonly AlertGroup[];
  readonly selectedId?: string | undefined;
  /** Clic o Enter sobre la fila: abre el detalle. */
  readonly onSelect: (id: string) => void;
  /** La fila recibió el foco (J / K o Tab): pasa a ser la seleccionada. */
  readonly onHighlight?: ((id: string) => void) | undefined;
  /** Acciones del menú «⋯»; sin ellas la fila no muestra el botón. */
  readonly actionsFor?: ((row: AlertRowData) => readonly MenuAction[]) | undefined;
}

export function AlertList(props: AlertListProps) {
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
      {props.groups.map((group) => (
        <tbody key={group.id}>
          {group.label && (
            <tr className={styles.groupHeader}>
              <th scope="rowgroup" colSpan={COLUMNS.length + 1}>
                {group.label}
                <span className={styles.groupCount}>{group.rows.length}</span>
              </th>
            </tr>
          )}
          {group.rows.map((row) => (
            <AlertRow key={row.id} row={row} isSelected={row.id === props.selectedId} {...props} />
          ))}
        </tbody>
      ))}
    </table>
  );
}
