import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { comparison } from "../../test/comparisonFakes";
import { fakeEngineServices } from "../../test/engineFakes";
import { inconsistency } from "../../test/inconsistencyFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";

async function openInconsistencies() {
  const result = comparison({ inconsistencies: [inconsistency(5), inconsistency(6)] });
  const startComparison = vi.fn(() => Promise.resolve(result));
  renderApp(fakeEngineServices({ comparisons: { startComparison } }));
  await act(() => Promise.resolve());
  await userEvent.click(screen.getByRole("button", { name: "Comparar dos versiones" }));
  const files = [new File(["a"], "v1.docx"), new File(["b"], "v2.docx")];
  await userEvent.upload(screen.getByLabelText("Elegir documentos"), files);
  await screen.findByRole("heading", { name: "Comparar documentos" });
  await userEvent.keyboard("2");
  return within(screen.getByRole("table"));
}

describe("Buscar inconsistencias con teclado", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("(regresión) al abrirla ya hay una fila elegida y su detalle a la vista", async () => {
    const table = await openInconsistencies();

    const selected = table.getAllByRole("row").filter((row) => row.ariaSelected === "true");
    expect(selected).toHaveLength(1);
    expect(screen.getByRole("button", { name: /Es correcto/ })).toBeVisible();
  });

  it("(regresión) cada dato es un botón al que se llega con Tab y se elige con Enter", async () => {
    const table = await openInconsistencies();
    const buttons = table.getAllByRole("button");
    expect(buttons).toHaveLength(2);

    buttons[1]?.focus();
    await userEvent.keyboard("{Enter}");

    expect(buttons[1]).toHaveAttribute("aria-current", "true");
    expect(buttons[0]).toHaveAttribute("aria-current", "false");
  });
});
