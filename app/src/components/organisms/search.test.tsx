import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "../../test/renderWithProviders";
import { SearchDialog } from "./SearchDialog";

describe("SearchDialog", () => {
  it("recorre los resultados con flechas y elige con Enter", async () => {
    const onSelect = vi.fn();
    renderWithProviders(
      <SearchDialog
        placeholder="Buscar"
        query="13"
        onQueryChange={vi.fn()}
        onSelect={onSelect}
        onClose={vi.fn()}
        groups={[
          {
            id: "alerts",
            label: "Alertas",
            items: [
              { id: "a", title: "Alerta 1" },
              {
                id: "b",
                title: "Alerta 2",
                excerpt: { text: "Contrato 1324", highlightStart: 9, highlightEnd: 13 },
              },
            ],
          },
        ]}
      />,
    );

    await userEvent.keyboard("{ArrowDown}{Enter}");

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "b" }));
    expect(screen.getByText("1324").tagName).toBe("MARK");
  });

  it("muestra el estado cuando no hay resultados y se cierra con Escape", async () => {
    const onClose = vi.fn();
    renderWithProviders(
      <SearchDialog
        placeholder="Buscar"
        query="z"
        status="Escriba al menos 2 letras."
        groups={[]}
        onQueryChange={vi.fn()}
        onSelect={vi.fn()}
        onClose={onClose}
      />,
    );

    expect(screen.getByText("Escriba al menos 2 letras.")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});
