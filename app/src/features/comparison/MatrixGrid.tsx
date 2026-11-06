import type { KeyboardEvent } from "react";

import { Icon } from "../../components/atoms/Icon";
import { joinClassNames } from "../../components/joinClassNames";
import { useI18n } from "../../i18n/i18nContext";
import styles from "./Compare.module.css";
import type { ComparisonMatrix, MatrixCell } from "./comparisonMatrix";

interface MatrixGridProps {
  readonly matrix: ComparisonMatrix;
  readonly selectedPair: number;
  readonly onSelectPair: (pairIndex: number) => void;
  readonly onOpenDocument: (document: string) => void;
}

interface HeaderButtonProps {
  readonly document: string;
  readonly axis: "row" | "column";
  readonly onOpen: (name: string) => void;
}

function HeaderButton({ document, axis, onOpen }: HeaderButtonProps) {
  const { t } = useI18n();
  const label = axis === "row" ? "comparison.matrixRowHeader" : "comparison.matrixHeader";
  return (
    <button
      type="button"
      title={document}
      aria-label={t(label, { document })}
      className={joinClassNames(styles.tableHead, styles.headerButton)}
      onClick={() => {
        onOpen(document);
      }}
    >
      {document}
    </button>
  );
}

interface CellButtonProps {
  readonly cell: MatrixCell;
  readonly isSelected: boolean;
  readonly onSelect: (pairIndex: number) => void;
}

/** Solo el conteo; el riesgo alto suma un tono más intenso y una marca, con su nombre accesible. */
function CellButton({ cell, isSelected, onSelect }: CellButtonProps) {
  const { tPlural } = useI18n();
  const isHigh = cell.highestRisk === "high";
  const key = isHigh ? "comparison.matrix.cellHigh" : "comparison.matrix.cellChanges";
  return (
    <button
      type="button"
      role="gridcell"
      aria-selected={isSelected}
      aria-label={tPlural({ key, count: cell.count })}
      className={joinClassNames(
        styles.matrixCell,
        isHigh && styles.matrixCellHigh,
        !cell.count && styles.matrixCellEmpty,
        isSelected && styles.rowSelected,
      )}
      onClick={() => {
        onSelect(cell.pairIndex);
      }}
    >
      {isHigh && <Icon name="report" size="xs" />}
      {cell.count}
    </button>
  );
}

const NEXT_KEYS = new Set(["ArrowRight", "ArrowDown"]);
const PREVIOUS_KEYS = new Set(["ArrowLeft", "ArrowUp"]);

/** Las flechas pasan de una celda a la siguiente (o anterior) del triángulo y la eligen. */
function moveBetweenCells(event: KeyboardEvent<HTMLDivElement>) {
  const step = NEXT_KEYS.has(event.key) ? 1 : PREVIOUS_KEYS.has(event.key) ? -1 : 0;
  if (!step) return;
  const cells = [...event.currentTarget.querySelectorAll<HTMLElement>("button[role=gridcell]")];
  const target = cells[cells.indexOf(document.activeElement as HTMLElement) + step];
  if (!target) return;
  event.preventDefault();
  target.focus();
  target.click();
}

type GridHandlers = Omit<MatrixGridProps, "matrix">;

/** La primera fila: el eje y un encabezado de columna por documento. */
function ColumnHeaders({
  documents,
  onOpenDocument,
}: GridHandlers & { documents: readonly string[] }) {
  const { t } = useI18n();
  return (
    <div role="row" className={styles.tableRow}>
      <span role="columnheader" className={styles.tableHead}>
        {t("comparison.matrix.axis")}
      </span>
      {documents.map((name) => (
        <div key={name} role="columnheader" className={styles.tableRow}>
          <HeaderButton document={name} axis="column" onOpen={onOpenDocument} />
        </div>
      ))}
    </div>
  );
}

interface MatrixRowProps extends GridHandlers {
  readonly row: string;
  readonly cells: readonly (MatrixCell | null | undefined)[];
  readonly rowIndex: number;
}

/** Una fila: su encabezado y sus celdas; la diagonal y la mitad inferior quedan vacías. */
function MatrixRow({ row, cells, rowIndex, ...handlers }: MatrixRowProps) {
  return (
    <div role="row" className={styles.tableRow}>
      <div role="rowheader" className={styles.tableRow}>
        <HeaderButton document={row} axis="row" onOpen={handlers.onOpenDocument} />
      </div>
      {cells.map((cell, columnIndex) =>
        cell && columnIndex > rowIndex ? (
          <CellButton
            key={`${row}-${String(columnIndex)}`}
            cell={cell}
            isSelected={cell.pairIndex === handlers.selectedPair}
            onSelect={handlers.onSelectPair}
          />
        ) : (
          <span
            key={`${row}-${String(columnIndex)}`}
            aria-hidden="true"
            className={styles.matrixSame}
          />
        ),
      )}
    </div>
  );
}

/** Solo el triángulo superior: cada par aparece una vez; el resto de la cuadrícula queda vacío. */
export function MatrixGrid({ matrix, ...handlers }: MatrixGridProps) {
  const { t } = useI18n();
  return (
    <div
      role="grid"
      aria-label={t("comparison.matrix.label")}
      className={styles.matrix}
      onKeyDown={moveBetweenCells}
      style={{
        gridTemplateColumns: `minmax(0, 1fr) repeat(${String(matrix.documents.length)}, minmax(0, 1fr))`,
      }}
    >
      <ColumnHeaders documents={matrix.documents} {...handlers} />
      {matrix.documents.map((row, rowIndex) => (
        <MatrixRow
          key={row}
          row={row}
          cells={matrix.cells[rowIndex] ?? []}
          rowIndex={rowIndex}
          {...handlers}
        />
      ))}
    </div>
  );
}
