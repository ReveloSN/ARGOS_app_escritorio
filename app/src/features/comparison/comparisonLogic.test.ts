import { describe, expect, it } from "vitest";

import {
  ADDED_CHANGE,
  CASE_CHANGE,
  comparison,
  MOVED_CHANGE,
  NEGATION_CHANGE,
  NUMBER_CHANGE,
  pair,
  V2,
  V3,
  VERSION_CHANGES,
} from "../../test/comparisonFakes";
import { inconsistency } from "../../test/inconsistencyFakes";
import { countByKind, DEFAULT_FILTERS, visibleChanges } from "./changeFilters";
import { changeValues } from "./changePresentation";
import { comparisonMatrix } from "./comparisonMatrix";
import { inconsistencyColumns, inconsistencyRows } from "./inconsistencyRows";
import { panelSegments, textRuns } from "./segmentRuns";

describe("filtros de cambios", () => {
  const changes = [...VERSION_CHANGES, CASE_CHANGE];

  it("muestra los cambios de mayúsculas salvo que se ignoren", () => {
    expect(visibleChanges(changes, DEFAULT_FILTERS)).toContain(CASE_CHANGE);

    const ignoring = { ...DEFAULT_FILTERS, ignored: new Set(["case" as const]) };
    expect(visibleChanges(changes, ignoring)).not.toContain(CASE_CHANGE);
  });

  it("«solo importantes» deja números, fechas, nombres y negaciones", () => {
    const important = visibleChanges(changes, { ...DEFAULT_FILTERS, isImportantOnly: true });

    expect(important.map((change) => change.number)).toEqual([1, 2, 4]);
  });

  it("filtra por tipo y cuenta cada tipo", () => {
    expect(visibleChanges(changes, { ...DEFAULT_FILTERS, type: "moved" })).toEqual([MOVED_CHANGE]);
    expect(countByKind(VERSION_CHANGES)).toEqual({ removed: 0, added: 1, modified: 2, moved: 1 });
  });
});

describe("tramos de los paneles", () => {
  it("corta el texto alrededor de cada marca", () => {
    const marks = [{ span: { start: 13, end: 17 }, kind: "changed" as const, changeNumber: 1 }];

    expect(textRuns("Contrato No. 4857", marks)).toEqual([
      { text: "Contrato No. " },
      { text: "4857", mark: "changed", changeNumber: 1 },
    ]);
  });

  it("marca lo cambiado en los dos lados y lo agregado solo en B", () => {
    const first = panelSegments(V2, VERSION_CHANGES, "first");
    const second = panelSegments(V3, VERSION_CHANGES, "second");

    expect(first[0]?.runs[1]).toEqual({ text: "4857", mark: "changed", changeNumber: 1 });
    expect(first[1]?.runs.some((run) => run.mark)).toBe(false);
    expect(second[2]?.runs[1]).toEqual({ text: "no", mark: "added", changeNumber: 2 });
    expect(second[3]?.runs).toEqual([{ text: V3[3]?.text, mark: "added", changeNumber: 4 }]);
    expect(second[1]?.moved).toBe(MOVED_CHANGE);
  });
});

describe("presentación de un cambio", () => {
  it("muestra el antes y el después según el tipo", () => {
    expect(changeValues(NUMBER_CHANGE)).toEqual({ before: "4857", after: "4587" });
    expect(changeValues(NEGATION_CHANGE)).toEqual({ before: "", after: "no" });
    expect(changeValues(ADDED_CHANGE).before).toBe("");
    expect(changeValues(MOVED_CHANGE)).toEqual({ before: V2[2]?.text, after: "" });
  });
});

describe("matriz", () => {
  it("resume cada par con su cantidad de cambios y su mayor riesgo", () => {
    const three = comparison({
      mode: "contract_annexes",
      pairs: [
        pair("Contrato_v2.docx", "Contrato_v3.docx", VERSION_CHANGES),
        pair("Contrato_v2.docx", "Anexo.pdf", [MOVED_CHANGE]),
        pair("Contrato_v3.docx", "Anexo.pdf"),
      ],
    });

    const matrix = comparisonMatrix(three, DEFAULT_FILTERS.ignored);

    expect(matrix.documents).toEqual(["Contrato_v2.docx", "Contrato_v3.docx", "Anexo.pdf"]);
    expect(matrix.cells[0]?.[0]).toBeNull();
    expect(matrix.cells[1]?.[0]).toEqual({ pairIndex: 0, count: 4, highestRisk: "high" });
    expect(matrix.cells[0]?.[2]).toEqual({ pairIndex: 1, count: 1, highestRisk: "low" });
    expect(matrix.cells[2]?.[1]).toEqual({ pairIndex: 2, count: 0, highestRisk: undefined });
  });
});

describe("tabla de inconsistencias", () => {
  it("pone el valor de cada documento y marca el que no coincide con la mayoría", () => {
    const alert = inconsistency(5);
    const columns = inconsistencyColumns(["Contrato_v2.docx", "Contrato_v3.docx"], [alert]);

    const [row] = inconsistencyRows([alert], columns);

    expect(columns).toEqual(["Contrato_v2.docx", "Contrato_v3.docx", "Anexo.xlsx"]);
    expect(row?.cells.map((cell) => cell && [cell.value, cell.isOdd])).toEqual([
      ["4857", false],
      ["4587", true],
      ["4857", false],
    ]);
  });
});
