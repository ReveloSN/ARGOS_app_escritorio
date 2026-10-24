import { describe, expect, it } from "vitest";

import {
  ADDED_CHANGE,
  comparison,
  NUMBER_CHANGE,
  pair,
  REMOVED_ANNEX_CHANGE,
} from "../../test/comparisonFakes";
import {
  againstAll,
  changeCountsByDocument,
  comparedDocumentNames,
  initialScope,
  otherDocuments,
  pairIndexOf,
  scopedChanges,
  type CompareScope,
} from "./comparisonScope";

const BASE = "Contrato.docx";
const ANNEX_ONE = "Anexo_1.pdf";
const ANNEX_TWO = "Anexo_2.pdf";

// Tres documentos comparados todos contra todos, como lo hace el motor con tres o más archivos.
const THREE = comparison({
  mode: "contract_annexes",
  pairs: [
    pair(BASE, ANNEX_ONE, [{ ...NUMBER_CHANGE, number: 1 }]),
    pair(BASE, ANNEX_TWO, [{ ...ADDED_CHANGE, number: 2 }, REMOVED_ANNEX_CHANGE]),
    pair(ANNEX_ONE, ANNEX_TWO, [{ ...NUMBER_CHANGE, number: 4 }]),
  ],
});

describe("alcance de la comparación", () => {
  it("lista los documentos comparados en el orden de carga", () => {
    expect(comparedDocumentNames(THREE)).toEqual([BASE, ANNEX_ONE, ANNEX_TWO]);
    expect(otherDocuments(THREE, ANNEX_ONE)).toEqual([BASE, ANNEX_TWO]);
  });

  it("empieza con el primer par, como antes", () => {
    expect(initialScope(THREE)).toEqual({
      base: BASE,
      against: { kind: "document", name: ANNEX_ONE },
    });
  });

  it("contra un documento concreto solo trae los cambios de ese par", () => {
    const scope: CompareScope = { base: BASE, against: { kind: "document", name: ANNEX_TWO } };

    const changes = scopedChanges(THREE, scope);

    expect(changes.map((item) => [item.change.number, item.other])).toEqual([
      [2, ANNEX_TWO],
      [3, ANNEX_TWO],
    ]);
    expect(pairIndexOf(THREE, scope)).toBe(1);
  });

  it("contra todos junta los cambios de todos los pares del base en una sola lista", () => {
    const changes = scopedChanges(THREE, againstAll(ANNEX_ONE));

    expect(changes.map((item) => [item.change.number, item.other])).toEqual([
      [1, BASE],
      [4, ANNEX_TWO],
    ]);
  });

  it("desglosa el resumen por documento, también los que no tienen cambios", () => {
    const scope = againstAll(BASE);
    const counts = changeCountsByDocument(THREE, scope, scopedChanges(THREE, scope));

    expect(counts).toEqual([
      { document: ANNEX_ONE, counts: { removed: 0, added: 0, modified: 1, moved: 0 } },
      { document: ANNEX_TWO, counts: { removed: 1, added: 1, modified: 0, moved: 0 } },
    ]);
  });

  it("un documento sin cambios aparece con ceros", () => {
    const calm = comparison({
      mode: "contract_annexes",
      pairs: [pair(BASE, ANNEX_ONE), pair(BASE, ANNEX_TWO, [{ ...NUMBER_CHANGE, number: 1 }])],
    });
    const scope = againstAll(BASE);

    const counts = changeCountsByDocument(calm, scope, scopedChanges(calm, scope));

    expect(counts.map((item) => item.document)).toEqual([ANNEX_ONE, ANNEX_TWO]);
    expect(counts[0]?.counts.modified).toBe(0);
  });
});
