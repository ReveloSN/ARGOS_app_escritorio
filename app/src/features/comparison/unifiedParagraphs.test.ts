import { describe, expect, it } from "vitest";

import {
  ADDED_CHANGE,
  MOVED_CHANGE,
  NEGATION_CHANGE,
  NUMBER_CHANGE,
  pair,
  REMOVED_ANNEX_CHANGE,
} from "../../test/comparisonFakes";
import { unifiedParagraphs } from "./unifiedParagraphs";

// El motor incluye el espacio dentro de lo insertado: «no » y no «no».
const NEGATED = {
  ...NEGATION_CHANGE,
  edits: [
    {
      kind: "inserted" as const,
      first: null,
      second: { start: 16, end: 19 },
      firstText: "",
      secondText: "no ",
      characters: [],
    },
  ],
};
const CHANGES = [NUMBER_CHANGE, NEGATED, MOVED_CHANGE, ADDED_CHANGE];
const PAIR = pair("Contrato_v2.docx", "Contrato_v3.docx", CHANGES);

describe("texto unificado", () => {
  it("pone lo eliminado de A y lo agregado de B en el mismo párrafo, con su cambio", () => {
    const [first] = unifiedParagraphs(PAIR, CHANGES);

    expect(first?.runs).toEqual([
      { text: "Contrato No. " },
      {
        text: "4857",
        mark: "removed",
        changeNumber: 1,
        isHighRisk: true,
        isData: true,
        core: { start: 1, end: 3 },
      },
      {
        text: "4587",
        mark: "added",
        changeNumber: 1,
        isHighRisk: true,
        isData: true,
        core: { start: 1, end: 3 },
      },
    ]);
  });

  it("una inserción mantiene el texto igual alrededor y solo marca lo agregado", () => {
    const negated = unifiedParagraphs(PAIR, CHANGES).find((paragraph) =>
      paragraph.changeNumbers.includes(NEGATED.number),
    );

    expect(negated?.runs.map((run) => run.text).join("")).toBe(
      "El arrendatario no podrá ceder el contrato.",
    );
    expect(negated?.runs.filter((run) => run.mark).map((run) => run.text)).toEqual(["no "]);
  });

  it("un párrafo movido queda en B y deja en A una nota sin texto", () => {
    const moved = unifiedParagraphs(PAIR, CHANGES).filter((paragraph) => paragraph.moved);

    expect(moved.map((paragraph) => paragraph.moved?.isDestination)).toEqual([true, false]);
    expect(moved[1]?.runs).toEqual([]);
    expect(moved[0]?.runs.map((run) => run.text).join("")).toBe(
      "Seguros a cargo del arrendatario.",
    );
  });

  it("un párrafo agregado va entero como agregado, y uno eliminado como eliminado", () => {
    const added = unifiedParagraphs(PAIR, CHANGES).find((paragraph) =>
      paragraph.changeNumbers.includes(ADDED_CHANGE.number),
    );
    expect(added?.runs).toEqual([
      { text: "Cláusula penal por $ 5.000.000.", mark: "added", changeNumber: 4, isHighRisk: true },
    ]);

    const removedPair = {
      ...PAIR,
      changes: [REMOVED_ANNEX_CHANGE],
      secondSegments: PAIR.secondSegments.slice(0, 2),
    };
    const removed = unifiedParagraphs(removedPair, [REMOVED_ANNEX_CHANGE]).find(
      (paragraph) => paragraph.runs[0]?.mark === "removed",
    );
    expect(removed?.runs[0]?.text).toBe("Seguros a cargo del arrendatario.");
  });

  it("un cambio que los filtros ocultan se lee como en B, sin marcas", () => {
    const paragraphs = unifiedParagraphs(PAIR, [NUMBER_CHANGE]);

    expect(paragraphs.flatMap((paragraph) => paragraph.runs).filter((run) => run.mark)).toEqual([
      expect.objectContaining({ changeNumber: 1 }),
      expect.objectContaining({ changeNumber: 1 }),
    ]);
    expect(paragraphs.some((paragraph) => paragraph.moved)).toBe(false);
    expect(MOVED_CHANGE.isMoved).toBe(true);
  });
});
