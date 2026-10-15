import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "../../test/renderWithProviders";
import { Breadcrumb } from "./Breadcrumb";
import { FilterChip } from "./FilterChip";
import { NavItem } from "./NavItem";
import { SearchField } from "./SearchField";
import { StepIndicator } from "./StepIndicator";
import { Tabs } from "./Tabs";

describe("SearchField", () => {
  it("busca al enviar y permite borrar la búsqueda", async () => {
    const onChange = vi.fn();
    const onSearch = vi.fn();
    renderWithProviders(
      <SearchField
        label={"Buscar en alertas"}
        value="4587"
        onChange={onChange}
        onSearch={onSearch}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Buscar" }));
    await userEvent.click(screen.getByRole("button", { name: "Borrar búsqueda" }));

    expect(onSearch).toHaveBeenCalledWith("4587");
    expect(onChange).toHaveBeenCalledWith("");
  });
});

describe("FilterChip", () => {
  it("un filtro activo se quita con su botón", async () => {
    const onRemove = vi.fn();
    renderWithProviders(<FilterChip label={"Riesgo: Alto"} active onRemove={onRemove} />);

    await userEvent.click(screen.getByRole("button", { name: "Quitar filtro: Riesgo: Alto" }));

    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("un filtro inactivo abre sus opciones", async () => {
    const onOpen = vi.fn();
    renderWithProviders(<FilterChip label={"Tipo: Todos"} onOpen={onOpen} />);

    await userEvent.click(screen.getByRole("button", { name: "Tipo: Todos" }));

    expect(onOpen).toHaveBeenCalledOnce();
  });
});

describe("NavItem", () => {
  it("marca la sección actual para lectores de pantalla", () => {
    renderWithProviders(<NavItem icon="history" label={"Historial"} active onSelect={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Historial" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("contraído conserva su nombre accesible y su tooltip", () => {
    renderWithProviders(<NavItem icon="tune" label={"Ajustes"} collapsed onSelect={vi.fn()} />);

    const item = screen.getByRole("button", { name: "Ajustes" });
    expect(item).toHaveAttribute("title", "Ajustes");
  });
});

describe("Breadcrumb", () => {
  it("cada nivel anterior es un enlace de regreso y el último es el actual", async () => {
    const onSelect = vi.fn();
    renderWithProviders(
      <Breadcrumb
        items={[
          { id: "session", label: "Expediente 2026-118", onSelect },
          { id: "file", label: "Contrato_4857_v3.pdf", isMonospace: true, onSelect },
          { id: "alert", label: "Alerta 1" },
        ]}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Expediente 2026-118" }));

    expect(onSelect).toHaveBeenCalledOnce();
    expect(screen.getByText("Alerta 1")).toHaveAttribute("aria-current", "page");
  });
});

describe("Tabs", () => {
  it("indica la pestaña seleccionada y cambia al pulsar otra", async () => {
    const onSelect = vi.fn();
    renderWithProviders(
      <Tabs
        label={"Secciones"}
        selectedId="alerts"
        onSelect={onSelect}
        tabs={[
          { id: "alerts", label: "Alertas", count: 9 },
          { id: "files", label: "Archivos", count: 5 },
        ]}
      />,
    );

    await userEvent.click(screen.getByRole("tab", { name: /Archivos/ }));

    expect(screen.getByRole("tab", { name: /Alertas/ })).toHaveAttribute("aria-selected", "true");
    expect(onSelect).toHaveBeenCalledWith("files");
  });
});

describe("StepIndicator", () => {
  it("marca el paso actual y los completados", () => {
    renderWithProviders(
      <StepIndicator steps={["Cargar", "Confirmar lectura", "Revisar"]} currentIndex={1} />,
    );

    expect(screen.getByText("Confirmar lectura").closest("li")).toHaveAttribute(
      "aria-current",
      "step",
    );
    expect(screen.getByText("Cargar").closest("li")).toHaveTextContent("check");
  });
});
