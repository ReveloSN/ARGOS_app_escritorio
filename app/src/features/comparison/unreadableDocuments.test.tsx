import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ComparisonResult } from "../../services/engine/comparisonTypes";
import type { DocumentReadResult } from "../../services/engine/reviewTypes";
import { comparison } from "../../test/comparisonFakes";
import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";

const GOOD: DocumentReadResult = {
  name: "bueno.txt",
  status: "read",
  reason: null,
  fragmentCount: 3,
  method: "text",
  pageCount: null,
};
const EMPTY: DocumentReadResult = {
  name: "vacio.txt",
  status: "unreadable",
  reason: "no_text",
  fragmentCount: 0,
  method: "text",
  pageCount: null,
};

async function compareFiles(result: ComparisonResult) {
  const startComparison = vi.fn(() => Promise.resolve(result));
  renderApp(fakeEngineServices({ comparisons: { startComparison } }));
  await act(() => Promise.resolve());
  await userEvent.click(screen.getByRole("button", { name: "Comparar dos versiones" }));
  const files = [new File(["a"], "bueno.txt"), new File([""], "vacio.txt")];
  await userEvent.upload(screen.getByLabelText("Elegir documentos"), files);
}

describe("Comparar con un archivo que no se pudo leer", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("(regresión) lo dice en tres partes y ofrece cerrar, en lugar de una pantalla vacía", async () => {
    await compareFiles(comparison({ documents: [GOOD, EMPTY], pairs: [] }));

    expect(await screen.findByText("No pudimos leer «vacio.txt».")).toBeVisible();
    expect(screen.getByText("El archivo no tiene texto.")).toBeVisible();
    expect(screen.getByText(/Revise que sea el archivo correcto/)).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: /Cerrar comparación/ }));
    expect(screen.getByRole("heading", { name: "Elija dos o más documentos" })).toBeVisible();
  });

  it("si otros archivos sí se leyeron, los compara y avisa del que quedó fuera", async () => {
    await compareFiles(comparison({ documents: [...comparison().documents, EMPTY] }));

    expect(await screen.findByText("No pudimos leer «vacio.txt».")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Comparar documentos" })).toBeVisible();
    expect(screen.getByRole("list", { name: "Cambios" })).toBeVisible();
  });
});
