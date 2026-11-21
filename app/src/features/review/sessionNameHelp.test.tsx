import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "../../test/renderWithProviders";
import { SessionNameAside } from "./ReviewAside";

describe("Nombre de la sesión", () => {
  it("se anuncia como obligatorio y explica para qué sirve", () => {
    renderWithProviders(<SessionNameAside name="" isNameMissing={false} onNameChange={vi.fn()} />);

    const field = screen.getByRole("textbox", { name: "Nombre de la sesión" });
    expect(field).toBeRequired();
    expect(field).toHaveAccessibleDescription(
      "Identifica la revisión en el Historial, en el selector de sesión y en el informe.",
    );
    expect(screen.getByText("(obligatorio)")).toBeVisible();
  });

  it("si falta, el error se suma a la ayuda sin reemplazarla", () => {
    renderWithProviders(<SessionNameAside name="" isNameMissing onNameChange={vi.fn()} />);

    const field = screen.getByRole("textbox", { name: "Nombre de la sesión" });
    expect(field).toBeInvalid();
    expect(field).toHaveAccessibleDescription(/Identifica la revisión.*Escriba un nombre/);
  });
});
