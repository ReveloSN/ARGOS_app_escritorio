import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "../../test/renderWithProviders";
import { FilterControl } from "./FilterControl";

// WCAG 2.4.3: al cerrar con Escape, el foco vuelve al chip y no se pierde en la página.
describe("FilterControl con teclado", () => {
  it("(regresión) Escape cierra las opciones y devuelve el foco al chip", async () => {
    renderWithProviders(
      <FilterControl
        name="Riesgo"
        summary="Riesgo: Todos"
        selected={[]}
        options={[
          { value: "high", label: "Alto" },
          { value: "medium", label: "Medio" },
        ]}
        onToggle={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    const user = userEvent.setup();
    const chip = screen.getByRole("button", { name: "Riesgo: Todos" });
    chip.focus();
    await user.keyboard("{Enter}");
    within(screen.getByRole("group", { name: "Riesgo" }))
      .getByRole("checkbox", { name: "Alto" })
      .focus();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("group", { name: "Riesgo" })).not.toBeInTheDocument();
    expect(chip).toHaveFocus();
  });
});
