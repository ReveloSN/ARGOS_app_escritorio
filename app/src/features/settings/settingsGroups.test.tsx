import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";

async function openSettingsWithEngineStopped() {
  renderApp(fakeEngineServices({ checkHealth: () => Promise.reject(new Error("sin respuesta")) }));
  await act(() => Promise.resolve());
  await userEvent.click(screen.getByRole("button", { name: /Ajustes/ }));
  return screen.getByRole("main");
}

describe("grupos de Ajustes", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("separa lo que depende del motor de lo que se guarda en este equipo", async () => {
    const page = await openSettingsWithEngineStopped();

    const analysis = within(page).getByRole("region", { name: "Análisis" });
    const app = within(page).getByRole("region", { name: "Esta aplicación" });
    expect(within(analysis).getByRole("region", { name: "Detección" })).toBeInTheDocument();
    expect(within(app).getByRole("region", { name: "Apariencia" })).toBeInTheDocument();
  });

  it("con el motor detenido, los ajustes de esta aplicación siguen disponibles", async () => {
    const page = await openSettingsWithEngineStopped();
    const app = within(page).getByRole("region", { name: "Esta aplicación" });

    expect(within(app).getByRole("radio", { name: "Oscuro" })).toBeEnabled();
    expect(within(app).getByRole("combobox", { name: "Idioma" })).toBeEnabled();
    const nav = within(page).getByRole("navigation", { name: "Secciones de ajustes" });
    expect(within(nav).getByRole("group", { name: "Análisis" })).toBeInTheDocument();
    expect(within(nav).getByRole("button", { name: "Apariencia" })).toBeEnabled();
  });
});
