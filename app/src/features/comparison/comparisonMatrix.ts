import type { ComparisonResult, PairComparisonResult } from "../../services/engine/comparisonTypes";
import type { RiskLevelValue } from "../../services/engine/reviewTypes";
import { shownChanges, type CosmeticMateriality } from "./changeFilters";

const RISK_WEIGHT: Readonly<Record<RiskLevelValue, number>> = { high: 3, medium: 2, low: 1 };

/** Una celda de la matriz: el par de documentos y cuántos cambios tiene, con su mayor riesgo. */
export interface MatrixCell {
  readonly pairIndex: number;
  readonly count: number;
  readonly highestRisk: RiskLevelValue | undefined;
}

export interface ComparisonMatrix {
  readonly documents: readonly string[];
  /** `cells[fila][columna]`; null en la diagonal o si el modo no comparó ese par. */
  readonly cells: readonly (readonly (MatrixCell | null)[])[];
}

/** Documentos en el orden en que aparecen en los pares (el de carga). */
export function comparedDocuments(comparison: ComparisonResult): string[] {
  const names = comparison.pairs.flatMap((pair) => [pair.firstDocument, pair.secondDocument]);
  return [...new Set(names)];
}

function highestRisk(pair: PairComparisonResult, ignored: ReadonlySet<CosmeticMateriality>) {
  return shownChanges(pair.changes, ignored).reduce<RiskLevelValue | undefined>(
    (highest, change) =>
      !highest || RISK_WEIGHT[change.risk] > RISK_WEIGHT[highest] ? change.risk : highest,
    undefined,
  );
}

function cellFor(
  comparison: ComparisonResult,
  documents: readonly [string, string],
  ignored: ReadonlySet<CosmeticMateriality>,
): MatrixCell | null {
  const pairIndex = comparison.pairs.findIndex(
    (pair) => documents.includes(pair.firstDocument) && documents.includes(pair.secondDocument),
  );
  const pair = comparison.pairs[pairIndex];
  if (!pair || documents[0] === documents[1]) return null;
  const count = shownChanges(pair.changes, ignored).length;
  return { pairIndex, count, highestRisk: highestRisk(pair, ignored) };
}

/** Matriz de 3 o más documentos: cada celda resume el par de su fila y su columna. */
export function comparisonMatrix(
  comparison: ComparisonResult,
  ignored: ReadonlySet<CosmeticMateriality>,
): ComparisonMatrix {
  const documents = comparedDocuments(comparison);
  const cells = documents.map((row) =>
    documents.map((column) => cellFor(comparison, [row, column], ignored)),
  );
  return { documents, cells };
}
