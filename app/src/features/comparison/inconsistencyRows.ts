import type {
  AlertResult,
  AlertSideResult,
  OccurrenceResult,
} from "../../services/engine/reviewTypes";
import { alertSides } from "../alerts/alertSides";

/** Lo que dice un documento sobre el dato: su valor y dónde aparece. */
export interface InconsistencyCell {
  readonly value: string;
  readonly occurrence: OccurrenceResult;
  /** Es el valor que no coincide con la mayoría de los documentos (se marca con ≠). */
  readonly isOdd: boolean;
}

export interface InconsistencyRow {
  readonly alert: AlertResult;
  /** Una celda por documento, en el orden de las columnas; undefined si no aparece. */
  readonly cells: readonly (InconsistencyCell | undefined)[];
}

function documentsOf(side: AlertSideResult): Set<string> {
  return new Set(side.occurrences.map((occurrence) => occurrence.document));
}

/** El lado que aparece en menos documentos es el que no coincide; a igualdad, el segundo.
 * Un solo valor (fecha imposible, campo vacío) es el que no está bien. */
function oddSide(alert: AlertResult): AlertSideResult {
  const { first, second } = alert;
  if (!second) return first;
  return documentsOf(first).size < documentsOf(second).size ? first : second;
}

function cellFor(alert: AlertResult, document: string): InconsistencyCell | undefined {
  const odd = oddSide(alert);
  for (const side of alertSides(alert)) {
    const occurrence = side.occurrences.find((item) => item.document === document);
    if (occurrence) return { value: side.value, occurrence, isOdd: side === odd };
  }
  return undefined;
}

/** Columnas de la tabla: los documentos leídos y, después, los adjuntos que citan las alertas. */
export function inconsistencyColumns(
  documents: readonly string[],
  alerts: readonly AlertResult[],
): string[] {
  const cited = alerts.flatMap((alert) =>
    alertSides(alert).flatMap((side) => side.occurrences.map((item) => item.document)),
  );
  return [...new Set([...documents, ...cited])];
}

/** Tabla dato × documento de «Buscar inconsistencias». */
export function inconsistencyRows(
  alerts: readonly AlertResult[],
  columns: readonly string[],
): InconsistencyRow[] {
  return alerts.map((alert) => ({
    alert,
    cells: columns.map((document) => cellFor(alert, document)),
  }));
}
