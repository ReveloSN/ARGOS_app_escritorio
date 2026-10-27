/** Tres documentos comparados todos contra todos, para las pruebas de alcance. */

import type { ComparisonResult } from "../services/engine/comparisonTypes";
import {
  comparison,
  NUMBER_CHANGE,
  pair,
  REMOVED_ANNEX_CHANGE,
  VERSION_CHANGES,
} from "./comparisonFakes";

export function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Falta un elemento que la prueba necesita.");
  return value;
}

export const V2 = "Contrato_v2.docx";
export const V3 = "Contrato_v3.docx";
export const ANNEX = "Anexo.pdf";
export const THREE: ComparisonResult = (() => {
  const base = comparison();
  return comparison({
    mode: "contract_annexes",
    documents: [
      ...base.documents,
      { ...required(base.documents[0]), name: ANNEX, fragmentCount: 2 },
    ],
    pairs: [
      pair(V2, V3, VERSION_CHANGES),
      pair(V2, ANNEX, [{ ...REMOVED_ANNEX_CHANGE, number: 6 }]),
      pair(V3, ANNEX, [{ ...NUMBER_CHANGE, number: 7 }]),
    ],
  });
})();
