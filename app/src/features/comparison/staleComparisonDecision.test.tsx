import { act, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { DecisionsResult } from "../../services/engine/reviewTypes";
import { comparison } from "../../test/comparisonFakes";
import { ReviewProvider } from "../review/ReviewProvider";
import { ComparisonProvider } from "./ComparisonProvider";
import { useComparison, type ComparisonState } from "./comparisonContext";

const FIRST = comparison({ id: "c1" });
const SECOND = comparison({ id: "c2", name: "Póliza 2027" });
const DECIDED_IN_FIRST: DecisionsResult = {
  decisions: [{ alertNumber: 1, kind: "error", correctSide: null, decidedAt: "" }],
  canUndo: true,
};

function renderComparisonState(): { readonly current: () => ComparisonState } {
  let state: ComparisonState | undefined;
  function Probe() {
    state = useComparison();
    return null;
  }
  render(
    <ReviewProvider>
      <ComparisonProvider>
        <Probe />
      </ComparisonProvider>
    </ReviewProvider>,
  );
  return {
    current: () => {
      if (!state) throw new Error("El proveedor de Comparar no se montó");
      return state;
    },
  };
}

// Decidir en A, cerrar con Esc y abrir B: la respuesta tardía de A no reemplaza las de B.
describe("decisiones de otra comparación", () => {
  it("(regresión) solo se aplican a la comparación que las pidió", () => {
    const state = renderComparisonState();
    act(() => {
      state.current().showComparison(FIRST);
    });
    act(() => {
      state.current().showComparison(SECOND);
    });

    act(() => {
      state.current().updateDecisions(DECIDED_IN_FIRST, FIRST.id);
    });

    expect(state.current().comparison?.id).toBe("c2");
    expect(state.current().comparison?.decisions).toEqual(SECOND.decisions);
  });
});
