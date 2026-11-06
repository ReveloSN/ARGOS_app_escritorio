import { describe, expect, it } from "vitest";

import {
  ADDED_CHANGE,
  CASE_CHANGE,
  comparison,
  NUMBER_CHANGE,
  pair,
} from "../../test/comparisonFakes";
import { DEFAULT_FILTERS } from "./changeFilters";
import { againstAll, againstDocument } from "./comparisonScope";
import { scopedList } from "./scopedList";

const BASE = "Contrato.docx";
const ANNEX_ONE = "Anexo_1.pdf";
const ANNEX_TWO = "Anexo_2.pdf";

const THREE = comparison({
  mode: "contract_annexes",
  pairs: [
    pair(BASE, ANNEX_ONE, [
      { ...NUMBER_CHANGE, number: 1 },
      { ...CASE_CHANGE, number: 5 },
    ]),
    pair(BASE, ANNEX_TWO, [{ ...ADDED_CHANGE, number: 2 }]),
    pair(ANNEX_ONE, ANNEX_TWO, [{ ...NUMBER_CHANGE, number: 4 }]),
  ],
});

const INPUT = {
  scope: againstAll(BASE),
  filters: DEFAULT_FILTERS,
  documentFilter: undefined,
  pairIndex: 0,
  selected: 2,
};

describe("lista del alcance", () => {
  it("contra todos junta los cambios de cada documento, cada uno con su documento", () => {
    const list = scopedList(THREE, INPUT);

    // Los de riesgo alto (1 y 2) van primero; el 5 es de riesgo medio.
    expect(list.visible.map((change) => change.number)).toEqual([1, 2, 5]);
    expect(list.againstByChange.get(1)).toBe(ANNEX_ONE);
    expect(list.againstByChange.get(2)).toBe(ANNEX_TWO);
    expect(list.selected?.number).toBe(2);
  });

  it("se puede filtrar por documento sin perder el resto de los filtros", () => {
    const list = scopedList(THREE, { ...INPUT, documentFilter: ANNEX_ONE });

    expect(list.visible.map((change) => change.number)).toEqual([1, 5]);
    expect(list.shown).toHaveLength(3);
  });

  it("contra un documento concreto, los paneles muestran solo los cambios de ese par", () => {
    const list = scopedList(THREE, {
      ...INPUT,
      scope: againstDocument(BASE, ANNEX_ONE),
      pairIndex: 0,
      selected: 1,
    });

    expect(list.pairChanges.map((change) => change.number)).toEqual([1, 5]);
    expect(list.visible.map((change) => change.number)).toEqual([1, 5]);
  });

  it("no cuenta los cambios de forma que se ignoran", () => {
    const filters = { ...DEFAULT_FILTERS, ignored: new Set(["case" as const]) };

    const list = scopedList(THREE, { ...INPUT, filters });

    expect(list.shown.map((item) => item.change.number)).toEqual([1, 2]);
  });
});
