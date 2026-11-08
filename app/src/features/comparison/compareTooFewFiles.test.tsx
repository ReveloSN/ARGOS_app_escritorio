import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";

async function openCompare() {
  await act(() => Promise.resolve());
  await userEvent.click(screen.getByRole("button", { name: "Comparar dos versiones" }));
}

// Prevención de errores (Nielsen 5): elegir un solo documento no puede quedar en silencio.
describe("Comparar con un solo documento", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("explica que hacen falta dos y no empieza la comparación", async () => {
    const startComparison = vi.fn();
    renderApp(fakeEngineServices({ comparisons: { startComparison } }));
    await openCompare();

    await userEvent.upload(screen.getByLabelText("Elegir documentos"), [
      new File(["texto"], "contrato.docx"),
    ]);

    expect(
      within(screen.getByRole("main")).getByText(
        "Eligió un documento. Elija al menos dos para compararlos.",
      ),
    ).toHaveAttribute("role", "status");
    expect(startComparison).not.toHaveBeenCalled();
  });
});
