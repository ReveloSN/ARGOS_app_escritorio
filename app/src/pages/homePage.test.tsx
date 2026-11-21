import { act, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fakeEngineServices } from "../test/engineFakes";
import { renderApp, stubBrowser } from "../test/renderApp";

async function renderHome() {
  renderApp(fakeEngineServices());
  await act(() => Promise.resolve());
  return screen.getByRole("main");
}

describe("Inicio sin revisiones", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("explica los tres pasos reales de una revisión, en orden", async () => {
    const main = await renderHome();

    const steps = within(main).getByRole("region", { name: "Cómo funciona una revisión" });
    const names = within(steps)
      .getAllByRole("listitem")
      .map((item) => item.firstElementChild?.textContent);
    expect(names).toEqual(["Cargar", "Confirmar lectura", "Revisar"]);
  });

  it("ofrece Nueva revisión como acción principal y Comparar dos versiones", async () => {
    const main = await renderHome();

    expect(within(main).getByRole("button", { name: /Nueva revisión/ })).toBeEnabled();
    expect(within(main).getByRole("button", { name: "Comparar dos versiones" })).toBeEnabled();
  });

  it("no repite el estado del asistente: solo lo dice la barra lateral", async () => {
    const main = await renderHome();

    expect(within(main).queryByRole("status", { name: /Asistente/ })).not.toBeInTheDocument();
    expect(within(main).queryByText("Listo")).not.toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Asistente de IA: Listo" })).toBeInTheDocument();
  });
});
