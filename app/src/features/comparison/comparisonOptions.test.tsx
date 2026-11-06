import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ComparisonRequest } from "../../services/engine/comparisonTypes";
import { CASE_CHANGE, comparison, pair, VERSION_CHANGES } from "../../test/comparisonFakes";
import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";

async function openComparison(changes = [...VERSION_CHANGES, CASE_CHANGE]) {
  const withCase = comparison({ pairs: [pair("Contrato_v2.docx", "Contrato_v3.docx", changes)] });
  const startComparison = vi.fn((request: ComparisonRequest) => {
    request.onProgress?.({ kind: "pair_compared", position: 0, total: 1 });
    return Promise.resolve(withCase);
  });
  renderApp(fakeEngineServices({ comparisons: { startComparison } }));
  await act(() => Promise.resolve());
  await userEvent.click(screen.getByRole("button", { name: "Comparar dos versiones" }));
  const files = [new File(["a"], "v1.docx"), new File(["b"], "v2.docx")];
  await userEvent.upload(screen.getByLabelText("Elegir documentos"), files);
  return screen.findByRole("button", { name: /^Opciones/ });
}

describe("Opciones de Comparar", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lo secundario va plegado y dice cuál es el filtro activo, con su nombre", async () => {
    const options = await openComparison();

    expect(options).toHaveAttribute("aria-expanded", "false");
    expect(options).toHaveTextContent("Ignorando: formato");
    expect(screen.queryByRole("checkbox", { name: "mayúsculas" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Faltan/ })).not.toBeInTheDocument();
    expect(screen.queryByText("tachado = falta en B")).not.toBeInTheDocument();
  });

  it("al abrirlas ofrece lo que ignorar, los tipos de cambio y la leyenda", async () => {
    const options = await openComparison();

    await userEvent.click(options);

    expect(options).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("checkbox", { name: "mayúsculas" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Mostrar el minimapa" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Faltan/ })).toBeInTheDocument();
    expect(screen.getByText("tachado = falta en B")).toBeInTheDocument();
  });

  it("(regresión) dos documentos iguales dicen que no hay diferencias, no que los filtros las ocultan", async () => {
    await openComparison([]);

    expect(await screen.findByText("No hay diferencias entre estos documentos.")).toBeVisible();
    expect(screen.queryByText("Ningún cambio con estos filtros.")).not.toBeInTheDocument();
  });

  it("si los filtros ocultan todos los cambios, lo dice y no afirma que no haya diferencias", async () => {
    const options = await openComparison();

    await userEvent.click(options);
    await userEvent.click(screen.getByRole("button", { name: /^Faltan/ }));

    expect(screen.getByText("Ningún cambio con estos filtros.")).toBeVisible();
    expect(screen.getByText("Cámbielos en «Opciones».")).toBeVisible();
    expect(
      screen.queryByText("No hay diferencias entre estos documentos."),
    ).not.toBeInTheDocument();
  });

  it("el atajo de cada modo no se confunde con un conteo: queda fuera del nombre", async () => {
    await openComparison();

    const tab = screen.getByRole("tab", { name: "Comparar versiones" });

    expect(tab).toHaveAttribute("aria-keyshortcuts", "1");
    expect(tab.querySelector("kbd")).toHaveTextContent("1");
  });

  it("la línea superior resume en corto: cuántos cambios hay y cuántos son importantes", async () => {
    await openComparison();

    expect(screen.getByText("5 cambios · 3 importantes")).toBeVisible();
    expect(screen.queryByText("faltan")).not.toBeInTheDocument();
  });

  it("(regresión) el minimapa vive en Opciones y la matriz solo se abre con su pestaña, no desde Opciones", async () => {
    const options = await openComparison();
    expect(screen.queryByRole("navigation", { name: "Minimapa de cambios" })).toBeNull();

    await userEvent.click(options);
    await userEvent.click(screen.getByRole("checkbox", { name: "Mostrar el minimapa" }));

    expect(screen.getByRole("navigation", { name: "Minimapa de cambios" })).toBeVisible();
    expect(options).toHaveAccessibleName("Opciones, Ignorando: formato");
    expect(
      screen.queryByRole("button", { name: "Ver la matriz de documentos" }),
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "Matriz" }));
    expect(screen.getByRole("tab", { name: "Matriz" })).toHaveAttribute("aria-selected", "true");
  });

  it("(regresión) el foco entra al abrir Opciones y vuelve al botón con Esc, sin cerrar la comparación", async () => {
    const options = await openComparison();

    await userEvent.keyboard("o");

    expect(options).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("combobox", { name: "Documento base" })).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(options).toHaveAttribute("aria-expanded", "false");
    expect(options).toHaveFocus();
    expect(screen.getByRole("heading", { name: "Comparar documentos" })).toBeVisible();
  });

  it("(regresión) el filtro por tipo se nombra en el botón y el minimapa no cuenta como filtro", async () => {
    const options = await openComparison();
    expect(screen.getAllByText("Riesgo alto", { selector: "span" }).length).toBeGreaterThan(0);

    await userEvent.click(options);
    await userEvent.click(screen.getByRole("button", { name: /^Faltan/ }));

    expect(options).toHaveAccessibleName("Opciones, Ignorando: formato · Mostrando: Faltan");
  });
});
