import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { comparison, pair, VERSION_CHANGES } from "../../test/comparisonFakes";
import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";

const PLAN = {
  folder: "C:/Docs/ARGUS/Arrendamiento",
  fileName: "Informe_x_011126",
  version: "0.1.0",
};

async function openComparison(comparisonReports: Parameters<typeof fakeEngineServices>[0]) {
  const result = comparison({
    pairs: [pair("Contrato_v2.docx", "Contrato_v3.docx", VERSION_CHANGES)],
  });
  const startComparison = vi.fn(() => Promise.resolve(result));
  renderApp(fakeEngineServices({ comparisons: { startComparison }, ...comparisonReports }));
  await act(() => Promise.resolve());
  await userEvent.click(screen.getByRole("button", { name: "Comparar dos versiones" }));
  const files = [new File(["a"], "v1.docx"), new File(["b"], "v2.docx")];
  await userEvent.upload(screen.getByLabelText("Elegir documentos"), files);
  await screen.findByRole("heading", { name: "Comparar documentos" });
}

describe("Exportar el informe de una comparación", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("guarda el informe en el formato elegido y dice dónde quedó, con «Abrir informe»", async () => {
    const planReport = vi.fn(() => Promise.resolve(PLAN));
    const exportReport = vi.fn(() =>
      Promise.resolve({ folder: PLAN.folder, fileName: "Informe_x_011126.docx" }),
    );
    const openReport = vi.fn(() => Promise.resolve());
    await openComparison({ comparisonReports: { planReport, exportReport, openReport } });

    await userEvent.click(screen.getByRole("button", { name: "Exportar informe" }));
    await userEvent.click(screen.getByRole("button", { name: "Word" }));

    expect(await screen.findByText(/Informe_x_011126\.docx/)).toBeVisible();
    expect(exportReport).toHaveBeenCalledWith(
      "c1",
      "docx",
      expect.objectContaining({ title: "Informe de comparación" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Abrir informe" }));
    expect(openReport).toHaveBeenCalledWith("c1", "Informe_x_011126.docx");
  });

  it("(regresión) si no se puede guardar, lo explica en 3 partes y permite reintentar", async () => {
    const planReport = vi.fn(() => Promise.resolve(PLAN));
    const exportReport = vi.fn(() => Promise.reject(new Error("sin respuesta")));
    await openComparison({ comparisonReports: { planReport, exportReport } });

    await userEvent.click(screen.getByRole("button", { name: "Exportar informe" }));
    await userEvent.click(screen.getByRole("button", { name: "PDF" }));

    expect(await screen.findByText("No se pudo exportar el informe.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeVisible();
  });
});
