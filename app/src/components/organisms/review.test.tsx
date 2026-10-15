import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "../../test/renderWithProviders";
import { AlertList, type AlertRowData } from "./AlertList";
import { ComparisonPanel } from "./ComparisonPanel";
import { UploadZone } from "./UploadZone";

const ROWS: readonly AlertRowData[] = [
  {
    id: "1",
    number: 1,
    risk: "high",
    title: "El número de contrato no coincide entre dos documentos",
    subtitle: "Identificador · Contrato_4857_v3.pdf, Anexo_1_condiciones.pdf",
    valueA: "4857",
    valueB: "4587",
    decision: "pending",
  },
  {
    id: "4",
    number: 4,
    risk: "medium",
    title: "La fecha de inicio es distinta",
    subtitle: "Fecha · Contrato_4857_v3.pdf p. 2",
    valueA: "01/07/2026",
    valueB: "01/08/2026",
    decision: "correct",
  },
];

describe("AlertList", () => {
  it("muestra riesgo con texto, ambos valores y el estado de cada alerta", () => {
    renderWithProviders(<AlertList rows={ROWS} selectedId="1" onSelect={vi.fn()} />);

    const table = screen.getByRole("table", { name: "Lista de alertas" });
    expect(table).toHaveTextContent("Alto");
    expect(table).toHaveTextContent("4587");
    expect(table).toHaveTextContent("Es correcto");
  });

  it("marca la fila seleccionada y selecciona con clic o con Enter", async () => {
    const onSelect = vi.fn();
    renderWithProviders(<AlertList rows={ROWS} selectedId="1" onSelect={onSelect} />);
    const [, firstRow, secondRow] = screen.getAllByRole("row");

    await userEvent.click(secondRow ?? document.body);
    secondRow?.focus();
    await userEvent.keyboard("{Enter}");

    expect(firstRow).toHaveAttribute("aria-selected", "true");
    expect(onSelect).toHaveBeenNthCalledWith(1, "4");
    expect(onSelect).toHaveBeenNthCalledWith(2, "4");
  });
});

describe("ComparisonPanel", () => {
  it("muestra los dos valores lado a lado, cada uno con su origen y apariciones", () => {
    renderWithProviders(
      <ComparisonPanel
        first={{
          value: "4857",
          positions: [2, 3],
          fileName: "Contrato_4857_v3.pdf",
          location: "Página 1",
          occurrences: 6,
          files: 3,
        }}
        second={{
          value: "4587",
          positions: [2, 3],
          fileName: "Anexo_1_condiciones.pdf",
          location: "Página 2",
          occurrences: 1,
          files: 1,
        }}
      />,
    );

    const panel = screen.getByRole("group", { name: "Comparar Valor A con Valor B" });
    expect(panel).toHaveTextContent("Valor A");
    expect(panel).toHaveTextContent("6 apariciones en 3 archivos");
    expect(panel).toHaveTextContent("1 aparición en 1 archivo");
    expect(panel).toHaveTextContent("Anexo_1_condiciones.pdf");
  });
});

describe("UploadZone", () => {
  it("entrega los archivos elegidos desde el equipo", async () => {
    const onFilesSelected = vi.fn();
    renderWithProviders(<UploadZone onFilesSelected={onFilesSelected} onPasteText={vi.fn()} />);
    const file = new File(["Contrato No. 4857"], "notas.txt", { type: "text/plain" });

    await userEvent.upload(screen.getByLabelText("Elegir archivos"), file);

    expect(onFilesSelected).toHaveBeenCalledWith([file]);
  });

  it("al arrastrar indica cuántos archivos se agregarán y los recibe al soltar", () => {
    const onFilesSelected = vi.fn();
    const { container } = renderWithProviders(
      <UploadZone onFilesSelected={onFilesSelected} onPasteText={vi.fn()} />,
    );
    const zone = container.firstElementChild ?? document.body;
    const file = new File(["x"], "anexo.pdf");

    fireEvent.dragEnter(zone, { dataTransfer: { items: [{}, {}, {}], files: [] } });
    expect(zone).toHaveTextContent("Suelte para agregar 3 archivos");
    fireEvent.drop(zone, { dataTransfer: { items: [{}], files: [file] } });

    expect(onFilesSelected).toHaveBeenCalledWith([file]);
  });
});
