import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";

async function renderAppAtHome() {
  renderApp(fakeEngineServices());
  await act(() => Promise.resolve());
}

describe("ubicación en la barra superior", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("muestra la sección actual y cambia al navegar", async () => {
    await renderAppAtHome();
    const banner = screen.getByRole("banner");
    expect(banner).toHaveTextContent("Inicio");

    await userEvent.click(screen.getByRole("button", { name: /^Ajustes/ }));

    expect(banner).toHaveTextContent("Ajustes");
    expect(banner).not.toHaveTextContent("Inicio");
  });

  it("las pantallas internas llevan su ruta a la barra superior, no dentro de la página", async () => {
    await renderAppAtHome();

    await userEvent.click(
      within(screen.getByRole("main")).getByRole("button", { name: /Nueva revisión/ }),
    );

    const trail = within(screen.getByRole("banner")).getByRole("navigation");
    expect(within(trail).getByRole("button", { name: "Inicio" })).toBeInTheDocument();
    expect(within(trail).getByText("Nueva revisión")).toHaveAttribute("aria-current", "page");
    expect(within(screen.getByRole("main")).queryByRole("navigation")).not.toBeInTheDocument();

    await userEvent.click(within(trail).getByRole("button", { name: "Inicio" }));

    expect(
      within(screen.getByRole("main")).getByRole("heading", { name: "Todavía no hay revisiones" }),
    ).toBeInTheDocument();
  });
});
