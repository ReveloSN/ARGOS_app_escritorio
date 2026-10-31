import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";
import { ANNEX, required, THREE, V2, V3 } from "../../test/threeDocuments";

async function openMatrix() {
  const startComparison = vi.fn(() => Promise.resolve(THREE));
  renderApp(fakeEngineServices({ comparisons: { startComparison } }));
  await act(() => Promise.resolve());
  await userEvent.click(screen.getByRole("button", { name: "Comparar dos versiones" }));
  const files = ["a", "b", "c"].map((name) => new File(["texto"], `${name}.docx`));
  await userEvent.upload(screen.getByLabelText("Elegir documentos"), files);
  return screen.findByRole("grid", { name: "Matriz de diferencias" });
}

const cells = () => screen.getAllByRole("gridcell");

describe("Matriz de documentos", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("(regresión) solo el triángulo superior: cada par aparece una vez, sin etiquetas de riesgo", async () => {
    const grid = await openMatrix();

    expect(cells()).toHaveLength(3);
    expect(cells().map((cell) => cell.textContent)).toEqual([
      expect.stringMatching(/4$/),
      expect.stringMatching(/1$/),
      expect.stringMatching(/1$/),
    ]);
    expect(grid).not.toHaveTextContent(/Alto|Medio|Bajo|sin diferencias|cambios/);
  });

  it("(regresión) el riesgo alto nunca va solo en color: lleva marca y nombre accesible", async () => {
    await openMatrix();

    expect(screen.getByRole("gridcell", { name: "Riesgo alto, 4 cambios" })).toBeVisible();
    expect(screen.getByRole("gridcell", { name: "Riesgo alto, 1 cambio" })).toBeVisible();
    cells().forEach((cell) => {
      if (cell.getAttribute("aria-label")?.startsWith("Riesgo alto")) {
        expect(cell.querySelector(".material-symbols-outlined")).not.toBeNull();
      }
    });
  });

  it.each([
    [0, V2, V3],
    [1, V2, ANNEX],
    [2, V3, ANNEX],
  ])("«Abrir el par» funciona con cualquier par (celda %i)", async (index, first, second) => {
    await openMatrix();
    await userEvent.click(required(cells()[index]));
    await userEvent.click(screen.getByRole("button", { name: /Abrir el par/ }));
    await userEvent.click(screen.getByRole("button", { name: /^Opciones/ }));

    expect(screen.getByRole("combobox", { name: "Documento base" })).toHaveValue(first);
    expect(screen.getByRole("combobox", { name: "Contra" })).toHaveValue(second);
  });

  it("(regresión) la cuadrícula tiene filas y encabezados semánticos, y fila y columna se distinguen", async () => {
    const grid = await openMatrix();

    expect(within(grid).getAllByRole("row")).toHaveLength(4);
    expect(within(grid).getAllByRole("columnheader")).toHaveLength(4);
    expect(within(grid).getAllByRole("rowheader")).toHaveLength(3);
    expect(within(grid).getAllByRole("button", { name: /^Columna: comparar/ })).toHaveLength(3);
    expect(within(grid).getAllByRole("button", { name: /^Fila: comparar/ })).toHaveLength(3);
  });
});
