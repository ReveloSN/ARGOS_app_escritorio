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

function HeaderButton({ document, onOpen }: { document: string; onOpen: (name: string) => void }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      title={document}
      aria-label={t("comparison.matrixHeader", { document })}
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

/** Solo el triángulo superior: cada par aparece una vez; el resto de la cuadrícula queda vacío. */
export function MatrixGrid({
  matrix,
  selectedPair,
  onSelectPair,
  onOpenDocument,
}: MatrixGridProps) {
  const { t } = useI18n();
  return (
    <div
      role="grid"
      aria-label={t("comparison.matrix.label")}
      className={styles.matrix}
      style={{
        gridTemplateColumns: `minmax(0, 1fr) repeat(${String(matrix.documents.length)}, minmax(0, 1fr))`,
      }}
    >
      <span className={styles.tableHead}>{t("comparison.matrix.axis")}</span>
      {matrix.documents.map((name) => (
        <HeaderButton key={name} document={name} onOpen={onOpenDocument} />
      ))}
      {matrix.documents.map((row, rowIndex) => [
        <HeaderButton key={row} document={row} onOpen={onOpenDocument} />,
        ...(matrix.cells[rowIndex] ?? []).map((cell, columnIndex) =>
          cell && columnIndex > rowIndex ? (
            <CellButton
              key={`${row}-${String(columnIndex)}`}
              cell={cell}
              isSelected={cell.pairIndex === selectedPair}
              onSelect={onSelectPair}
            />
          ) : (
            <span
              key={`${row}-${String(columnIndex)}`}
              aria-hidden="true"
              className={styles.matrixSame}
            />
          ),
        ),
      ])}
    </div>
  );
}
