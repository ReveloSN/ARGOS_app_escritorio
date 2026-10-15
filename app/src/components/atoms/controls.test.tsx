import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "../../test/renderWithProviders";
import { Checkbox } from "./Checkbox";
import { ProgressBar } from "./ProgressBar";
import { TextField } from "./TextField";
import { Toggle } from "./Toggle";

describe("Checkbox", () => {
  it("cambia al pulsar su etiqueta", async () => {
    const onChange = vi.fn();
    renderWithProviders(<Checkbox label={"Montos"} checked={false} onChange={onChange} />);

    await userEvent.click(screen.getByText("Montos"));

    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe("Toggle", () => {
  it("es un interruptor accesible que informa su estado", async () => {
    const onChange = vi.fn();
    renderWithProviders(<Toggle label={"Guardar historial"} checked onChange={onChange} />);

    const toggle = screen.getByRole("switch", { name: "Guardar historial" });
    await userEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(onChange).toHaveBeenCalledWith(false);
  });
});

describe("TextField", () => {
  it("asocia la etiqueta al campo", async () => {
    const onChange = vi.fn();
    renderWithProviders(<TextField label={"Nombre de la sesión"} value="" onChange={onChange} />);

    await userEvent.type(screen.getByLabelText("Nombre de la sesión"), "E");

    expect(onChange).toHaveBeenCalledWith("E");
  });

  it("anuncia el error y lo describe junto al campo", () => {
    renderWithProviders(
      <TextField
        label={"Nombre de la sesión"}
        value=""
        onChange={vi.fn()}
        error={"Escriba un nombre para la sesión."}
      />,
    );

    const field = screen.getByLabelText("Nombre de la sesión");
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAccessibleDescription("Escriba un nombre para la sesión.");
  });
});

describe("ProgressBar", () => {
  it("expone el avance como porcentaje accesible", () => {
    renderWithProviders(<ProgressBar value={0.64} label={"Leyendo adjuntos"} />);

    const bar = screen.getByRole("progressbar", { name: "Leyendo adjuntos" });
    expect(bar).toHaveAttribute("aria-valuenow", "64");
  });

  it("limita valores fuera de rango", () => {
    renderWithProviders(<ProgressBar value={1.7} label={"Avance"} />);

    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });
});
