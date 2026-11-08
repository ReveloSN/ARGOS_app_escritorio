import type { FactResult } from "../../services/engine/factTypes";
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
  /** El otro valor, si los dos lados citan este mismo documento (verificaciones internas). */
  readonly also?: InconsistencyCell;
}

export interface InconsistencyRow {
  readonly alert: AlertResult;
  /** El dato confirmado del expediente que sirve de referencia, si lo hay. */
  readonly confirmed: FactResult | undefined;
  /** Una celda por documento, en el orden de las columnas; undefined si no aparece. */
  readonly cells: readonly (InconsistencyCell | undefined)[];
}

function documentsOf(side: AlertSideResult): Set<string> {
  return new Set(side.occurrences.map((occurrence) => occurrence.document));
}

function agrees(side: AlertSideResult, fact: FactResult): boolean {
  return side.value === fact.value || side.normalizedValue === fact.value;
}

/** El lado que contradice el dato confirmado, si uno lo contradice y el otro no. */
function contradicting(
  alert: AlertResult & { readonly second: AlertSideResult },
  confirmed: FactResult | undefined,
): AlertSideResult | undefined {
  if (!confirmed) return undefined;
  const { first, second } = alert;
  if (agrees(first, confirmed) === agrees(second, confirmed)) return undefined;
  return agrees(first, confirmed) ? second : first;
}

/** Con un dato confirmado, el lado que lo contradice no coincide. Si no, el lado que aparece en
 * menos documentos; a igualdad, el segundo. Un solo valor (fecha imposible, campo vacío) es el
 * que no está bien. */
function oddSide(
  alert: AlertResult,
  confirmed: FactResult | undefined,
): AlertSideResult | undefined {
  const { first, second } = alert;
  if (!second) return first;
  const contradicted = contradicting({ ...alert, second }, confirmed);
  if (contradicted) return contradicted;
  const firstCount = documentsOf(first).size;
  const secondCount = documentsOf(second).size;
  // Con el mismo número de documentos no hay mayoría: ningún valor se marca como el que no coincide.
  if (firstCount === secondCount) return undefined;
  return firstCount < secondCount ? first : second;
}

function cellFor(
  alert: AlertResult,
  document: string,
  confirmed: FactResult | undefined,
): InconsistencyCell | undefined {
  const odd = oddSide(alert, confirmed);
  const [first, second] = alertSides(alert).flatMap((side) => {
    const occurrence = side.occurrences.find((item) => item.document === document);
    return occurrence ? [{ value: side.value, occurrence, isOdd: side === odd }] : [];
  });
  if (!first) return undefined;
  return second ? { ...first, also: second } : first;
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
  confirmedOf: (alert: AlertResult) => FactResult | undefined = () => undefined,
): InconsistencyRow[] {
  return alerts.map((alert) => {
    const confirmed = confirmedOf(alert);
    return {
      alert,
      confirmed,
      cells: columns.map((document) => cellFor(alert, document, confirmed)),
    };
  });
}
