import { describe, expect, it } from "vitest";

import { NEGATION_CHANGE, NUMBER_CHANGE, VERSION_CHANGES } from "../../test/comparisonFakes";
import { decisionTotals } from "./reviewTotals";

const decided = (alertNumber: number, kind: "error" | "correct" | "ignored") => ({
  alertNumber,
  kind,
  correctSide: null,
  decidedAt: "",
});

describe("Totales de lo decidido", () => {
  it("cuenta cada tipo de decisión solo entre los cambios que se le piden", () => {
    const decisions = [
      decided(NUMBER_CHANGE.number, "error"),
      decided(NEGATION_CHANGE.number, "ignored"),
      decided(999, "correct"),
    ];

    expect(decisionTotals([NUMBER_CHANGE, NEGATION_CHANGE], decisions)).toEqual({
      error: 1,
      correct: 0,
      ignored: 1,
    });
  });

  it("sin decisiones todo es cero", () => {
    expect(decisionTotals(VERSION_CHANGES, [])).toEqual({ error: 0, correct: 0, ignored: 0 });
  });
});
