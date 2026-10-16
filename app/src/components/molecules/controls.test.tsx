import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "../../test/renderWithProviders";
import { ActionMenu } from "./ActionMenu";
import { DifferenceLine } from "./DifferenceLine";
import { FilterControl } from "./FilterControl";
import { RiskSummary } from "./RiskSummary";
import { SegmentedControl } from "./SegmentedControl";
import { SelectField } from "./SelectField";
import { ShortcutBar } from "./ShortcutBar";

describe("ActionMenu", () => {
  it("enfoca la primera acción, se recorre con flechas y se cierra con Escape", async () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    renderWithProviders(
      <ActionMenu
        label="Acciones"
        onClose={onClose}
        actions={[
          { id: "open", icon: "compare", label: "Abrir detalle", shortcut: "↵", onSelect: vi.fn() },
          {
            id: "correct",
            icon: "check",
            label: "Es correcto",
            shortcut: "C",
            startsGroup: true,
            onSelect,
          },
        ]}
      />,
    );

    expect(screen.getByRole("menuitem", { name: /Abrir detalle/ })).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}{Enter}");
    expect(onSelect).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("se cierra al presionar Escape", async () => {
    const onClose = vi.fn();
    renderWithProviders(
      <ActionMenu
        label="Acciones"
        onClose={onClose}
        actions={[{ id: "a", icon: "check", label: "A", onSelect: vi.fn() }]}
      />,
    );

    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});

describe("FilterControl", () => {
  it("abre sus opciones, cambia una y se quita con ×", async () => {
    const onToggle = vi.fn();
    const onClear = vi.fn();
    renderWithProviders(
      <FilterControl
        name="Riesgo"
        summary="Riesgo: Alto"
        selected={["high"]}
        options={[
          { value: "high", label: "Alto" },
          { value: "medium", label: "Medio" },
        ]}
        onToggle={onToggle}
        onClear={onClear}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Riesgo: Alto" }));
    const options = screen.getByRole("group", { name: "Riesgo" });
    await userEvent.click(within(options).getByRole("checkbox", { name: "Medio" }));
    expect(onToggle).toHaveBeenCalledWith("medium");
    await userEvent.click(screen.getByRole("button", { name: "Quitar filtro: Riesgo: Alto" }));
    expect(onClear).toHaveBeenCalled();
  });
});

describe("SegmentedControl y SelectField", () => {
  it("las opciones excluyentes se eligen como radios", async () => {
    const onChange = vi.fn();
    renderWithProviders(
      <SegmentedControl
        label="Sensibilidad"
        value="balanced"
        onChange={onChange}
        options={[
          { value: "strict", label: "Estricta" },
          { value: "balanced", label: "Equilibrada" },
        ]}
      />,
    );

    expect(screen.getByRole("radio", { name: "Equilibrada" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await userEvent.click(screen.getByRole("radio", { name: "Estricta" }));
    expect(onChange).toHaveBeenCalledWith("strict");
  });

  it("la lista desplegable es nativa y tiene su etiqueta", async () => {
    const onChange = vi.fn();
    renderWithProviders(
      <SelectField
        label="Idioma"
        value="es"
        onChange={onChange}
        options={[
          { value: "es", label: "Español (Colombia)" },
          { value: "en", label: "English (United States)" },
        ]}
      />,
    );

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Idioma" }), "en");
    expect(onChange).toHaveBeenCalledWith("en");
  });
});

describe("piezas informativas", () => {
  it("el resumen de riesgo usa texto e icono, no solo color", () => {
    renderWithProviders(<RiskSummary counts={{ high: 3, medium: 4, low: 2 }} />);

    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "reportAlto3",
      "warningMedio4",
      "infoBajo2",
    ]);
  });

  it("la línea de diferencia aclara que los caracteres están resaltados", () => {
    renderWithProviders(
      <DifferenceLine
        description="Diferencia: posiciones 2 y 3 intercambiadas"
        change="8 ↔ 5"
        isHighlighted
      />,
    );

    expect(screen.getByText("8 ↔ 5")).toBeInTheDocument();
    expect(screen.getByText(/resaltados y subrayados/)).toBeInTheDocument();
  });

  it("la barra de atajos muestra cada tecla con su acción", () => {
    renderWithProviders(<ShortcutBar hints={[{ keys: ["C", "E", "I"], label: "decidir" }]} />);

    expect(screen.getByRole("contentinfo", { name: "Atajos de teclado" })).toHaveTextContent(
      "C E Idecidir",
    );
  });
});
