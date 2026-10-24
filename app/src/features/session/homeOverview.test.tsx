import { act, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";
import { REVIEW } from "../../test/reviewFixtures";

describe("Inicio con una sesión activa", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("(regresión) Inicio y la barra lateral muestran las mismas cifras de la sesión", async () => {
    renderApp(fakeEngineServices(), REVIEW);
    await act(() => Promise.resolve());

    const sidebar = screen.getByRole("navigation");
    const home = screen.getByRole("main");

    expect(
      screen.queryByRole("heading", { name: "Todavía no hay revisiones" }),
    ).not.toBeInTheDocument();
    expect(within(sidebar).getByText("2 alertas pendientes de 2")).toBeInTheDocument();
    expect(within(home).getByText("2 alertas pendientes de 2")).toBeInTheDocument();
    expect(within(home).getByText("Revisión de prueba")).toBeInTheDocument();
    expect(within(home).getByText("3 documentos cargados")).toBeInTheDocument();
  });

  it("desglosa las alertas pendientes por riesgo, con etiqueta además del color", async () => {
    renderApp(fakeEngineServices(), REVIEW);
    await act(() => Promise.resolve());

    const risks = within(screen.getByRole("main")).getByRole("group", {
      name: "Alertas pendientes por riesgo",
    });
    expect(within(risks).getByText("Alto").closest("li")).toHaveTextContent("1");
    expect(within(risks).getByText("Medio").closest("li")).toHaveTextContent("1");
  });

  it("ofrece accesos directos para seguir la revisión, revisar otra o comparar", async () => {
    renderApp(fakeEngineServices(), REVIEW);
    await act(() => Promise.resolve());

    const home = within(screen.getByRole("main"));
    expect(home.getByRole("button", { name: /Continuar la revisión/ })).toBeInTheDocument();
    expect(home.getByRole("button", { name: /Nueva revisión/ })).toBeInTheDocument();
    expect(home.getByRole("button", { name: "Comparar dos versiones" })).toBeInTheDocument();
  });
});
