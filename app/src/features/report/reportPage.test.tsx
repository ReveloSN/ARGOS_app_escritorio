import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";
import { CLOSED_REVIEW } from "../../test/reviewFixtures";

const PLAN = {
  folder: "Documentos/ARGUS/Revisión_de_prueba",
  fileName: "Informe_Revisión_de_prueba_231026",
  version: "0.1.0",
};

async function openReportScreen(services: ReturnType<typeof fakeEngineServices>) {
  renderApp(services, CLOSED_REVIEW);
  await act(() => Promise.resolve());
  await userEvent.click(screen.getByRole("button", { name: /^Expediente/ }));
  await userEvent.click(screen.getByRole("button", { name: "Generar informe" }));
}

describe("Informe exportable", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("muestra la vista previa con los datos reales y dónde se guardará", async () => {
    await openReportScreen(
      fakeEngineServices({ reports: { planReport: () => Promise.resolve(PLAN) } }),
    );

    const preview = within(screen.getByRole("article", { name: "Vista previa del informe" }));
    expect(preview.getByText("Informe de revisión documental")).toBeInTheDocument();
    expect(preview.getByText("2. Evidencia")).toBeInTheDocument();
    expect(await screen.findByText(PLAN.folder)).toBeInTheDocument();
    expect(screen.getByText(`${PLAN.fileName}.pdf`)).toBeInTheDocument();
  });

  it("quita una sección, exporta en DOCX y abre el informe guardado", async () => {
    const saved = { folder: PLAN.folder, fileName: `${PLAN.fileName}.docx` };
    const exportReport = vi.fn(() => Promise.resolve(saved));
    const openReport = vi.fn(() => Promise.resolve());
    await openReportScreen(
      fakeEngineServices({
        reports: { planReport: () => Promise.resolve(PLAN), exportReport, openReport },
      }),
    );
    await screen.findByText(PLAN.folder);

    await userEvent.click(screen.getByRole("checkbox", { name: "Evidencia" }));
    await userEvent.click(screen.getByRole("radio", { name: "DOCX" }));
    await userEvent.keyboard("{Control>}e{/Control}");

    expect(exportReport).toHaveBeenCalledWith(
      "s-1",
      "docx",
      expect.objectContaining({ title: "Informe de revisión documental" }),
    );
    const [, , document] = exportReport.mock.calls[0] as unknown as [
      string,
      string,
      { sections: { heading: string }[] },
    ];
    expect(document.sections.map((section) => section.heading)).toEqual([
      "1. Resumen",
      "2. Decisiones tomadas",
      "3. Nota sobre sugerencias de IA",
    ]);
    expect(
      await screen.findByText(`Se guardó ${saved.fileName} en ${PLAN.folder}.`),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Abrir informe" }));
    expect(openReport).toHaveBeenCalledWith("s-1", saved.fileName);
  });

  it("si no se puede exportar lo explica en tres partes", async () => {
    const exportReport = vi.fn(() => Promise.reject(new Error("motor detenido")));
    await openReportScreen(
      fakeEngineServices({ reports: { planReport: () => Promise.resolve(PLAN), exportReport } }),
    );
    await screen.findByText(PLAN.folder);

    await userEvent.click(screen.getByRole("button", { name: /Exportar PDF/ }));

    expect(await screen.findByText("No se pudo exportar el informe.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });
});
