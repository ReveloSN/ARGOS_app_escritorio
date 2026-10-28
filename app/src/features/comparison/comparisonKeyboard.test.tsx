import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { onlyRows } from "../../test/changeRows";
import { comparison, pair, VERSION_CHANGES } from "../../test/comparisonFakes";
import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";
import { ANNEX, required, THREE, V2, V3 } from "../../test/threeDocuments";

async function open(result = THREE, fileCount = 3) {
  const startComparison = vi.fn(() => Promise.resolve(result));
  renderApp(fakeEngineServices({ comparisons: { startComparison } }));
  await act(() => Promise.resolve());
  await userEvent.click(screen.getByRole("button", { name: "Comparar dos versiones" }));
  const files = Array.from({ length: fileCount }, (_, i) => new File(["x"], `f${String(i)}.docx`));
  await userEvent.upload(screen.getByLabelText("Elegir documentos"), files);
}

describe("Comparar con teclado", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("(regresión) en la matriz, Tab recorre encabezados y celdas en orden, y las flechas eligen el par", async () => {
    await open();
    await screen.findByRole("grid", { name: "Matriz de diferencias" });
    const cells = screen.getAllByRole("gridcell");

    cells.forEach((cell) => {
      expect(cell.tagName).toBe("BUTTON");
    });
    required(cells[0]).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(cells[1]).toHaveFocus();
    expect(cells[1]).toHaveAttribute("aria-selected", "true");
    const panel = screen.getByRole("region", { name: "Par seleccionado" });
    expect(within(panel).getByText(V2)).toBeVisible();
    expect(within(panel).getByText(ANNEX)).toBeVisible();
    await userEvent.keyboard("{ArrowLeft}");
    expect(cells[0]).toHaveFocus();
    expect(within(panel).getByText(V3)).toBeVisible();
  });

  it("(regresión) una fila de la lista es un botón: Enter la elige y abre su detalle bajo ella", async () => {
    await open(comparison({ pairs: [pair(V2, V3, VERSION_CHANGES)] }), 2);
    const list = within(await screen.findByRole("list", { name: "Cambios" }));
    const row = required(onlyRows(list.getAllByRole("button"))[1]);

    row.focus();
    await userEvent.keyboard("{Enter}");

    expect(row).toHaveAttribute("aria-current", "true");
    expect(
      within(required(row.closest("li") ?? undefined)).getAllByRole("region"),
    ).not.toHaveLength(0);
  });
});
