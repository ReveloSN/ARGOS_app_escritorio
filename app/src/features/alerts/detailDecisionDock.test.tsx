import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DecisionsResult } from "../../services/engine/reviewTypes";
import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";
import { REVIEW } from "../../test/reviewFixtures";

const ERROR_ON_FIRST: DecisionsResult = {
  decisions: [
    { alertNumber: 1, kind: "error", correctSide: null, decidedAt: "2026-10-15T10:05:00+00:00" },
  ],
  canUndo: true,
};
const TOTAL = REVIEW.alerts.length;

async function openFirstAlert() {
  await act(() => Promise.resolve());
  await userEvent.click(screen.getByRole("button", { name: /^Expediente/ }));
  const table = screen.getByRole("table", { name: "Lista de alertas" });
  await userEvent.click(within(table).getAllByRole("row")[2] ?? table);
  return screen.getByRole("region", { name: "¿Cómo quiere continuar?" });
}

// El bloque de decisión reúne lo que falta, lo elegido y cómo deshacerlo, sin avisos flotantes.
describe("Bloque de decisión del detalle", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("dice cuántas faltan, marca la elegida con texto y confirma dentro del bloque", async () => {
    const decide = vi.fn(() => Promise.resolve(ERROR_ON_FIRST));
    const undoDecision = vi.fn(() => Promise.resolve({ decisions: [], canUndo: false }));
    renderApp(fakeEngineServices({ reviews: { decide, undoDecision } }), REVIEW);
    const panel = await openFirstAlert();
    expect(panel).toHaveTextContent(
      `0 de ${String(TOTAL)} decididas · ${String(TOTAL)} pendientes`,
    );

    await userEvent.click(within(panel).getByRole("button", { name: /Es un error/ }));

    const chosen = within(panel).getByRole("button", { pressed: true });
    expect(chosen).toHaveTextContent("Es un error");
    expect(chosen).toHaveTextContent("Elegida");
    expect(
      await within(panel).findByText("Alerta 1 marcada como «Es un error»."),
    ).toBeInTheDocument();
    expect(panel).toHaveTextContent(
      `1 de ${String(TOTAL)} decididas · ${String(TOTAL - 1)} pendientes`,
    );

    await userEvent.click(within(panel).getByRole("button", { name: /Deshacer/ }));

    expect(undoDecision).toHaveBeenCalledWith("s-1");
    expect(await within(panel).findByText("Se deshizo la decisión.")).toBeInTheDocument();
    expect(within(panel).queryByText("Elegida")).not.toBeInTheDocument();
  });
});
