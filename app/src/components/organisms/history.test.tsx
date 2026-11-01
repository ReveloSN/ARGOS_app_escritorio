import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "../../test/renderWithProviders";
import { MetricsStrip } from "./MetricsStrip";
import { SessionHistoryTable } from "./SessionHistoryTable";

describe("MetricsStrip y SessionHistoryTable", () => {
  it("presenta cada métrica con su etiqueta y explicación", () => {
    renderWithProviders(
      <MetricsStrip
        label="Métricas de uso"
        metrics={[
          { id: "resolved", label: "Alertas resueltas", value: "214", detail: "en 23 sesiones" },
        ]}
      />,
    );

    expect(screen.getByRole("term")).toHaveTextContent("Alertas resueltas");
    expect(screen.getAllByRole("definition").map((item) => item.textContent)).toEqual([
      "214",
      "en 23 sesiones",
    ]);
  });

  it("selecciona con clic y abre con Enter", async () => {
    const onSelect = vi.fn();
    const onOpen = vi.fn();
    renderWithProviders(
      <SessionHistoryTable
        selectedId={undefined}
        onSelect={onSelect}
        onOpen={onOpen}
        rows={[
          {
            id: "s-1",
            name: "Expediente",
            date: "13/10/2026 09:42",
            files: 5,
            alerts: 9,
            decided: "2 de 9",
            statusIcon: "pending",
            statusLabel: "En curso",
          },
        ]}
      />,
    );

    const [, row] = screen.getAllByRole("row");
    await userEvent.click(row ?? document.body);
    await userEvent.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith("s-1");
    expect(onOpen).toHaveBeenCalledWith("s-1");
  });

  it("(regresión) con el teclado Espacio elige la fila y las flechas pasan a la vecina eligiéndola", async () => {
    const onSelect = vi.fn();
    const base = {
      date: "13/10/2026",
      files: 2,
      alerts: 1,
      decided: "—",
      statusIcon: "pending",
      statusLabel: "En curso",
    };
    renderWithProviders(
      <SessionHistoryTable
        selectedId={undefined}
        onSelect={onSelect}
        onOpen={vi.fn()}
        rows={[
          { ...base, id: "s-1", name: "Primera" },
          { ...base, id: "s-2", name: "Segunda" },
        ]}
      />,
    );
    const [, first, second] = screen.getAllByRole("row");

    first?.focus();
    await userEvent.keyboard(" ");
    expect(onSelect).toHaveBeenLastCalledWith("s-1");

    await userEvent.keyboard("{ArrowDown}");
    expect(onSelect).toHaveBeenLastCalledWith("s-2");
    expect(second).toHaveFocus();
    await userEvent.keyboard("{ArrowUp}");
    expect(onSelect).toHaveBeenLastCalledWith("s-1");
    expect(first).toHaveFocus();
  });
});
