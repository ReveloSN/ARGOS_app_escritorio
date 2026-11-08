import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderApp, stubBrowser } from "../../test/renderApp";
import { REVIEW } from "../../test/reviewFixtures";
import { engineWithTwoSessions } from "../../test/sessionFixtures";

describe("detalle de alerta al cambiar de sesión", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("si la alerta no existe en la sesión nueva, la pantalla no queda en blanco", async () => {
    renderApp(engineWithTwoSessions().services, REVIEW);
    await act(() => Promise.resolve());
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /^Expediente/ }));
    const table = screen.getByRole("table", { name: "Lista de alertas" });
    await user.click(within(table).getAllByRole("row")[3] ?? table);

    await user.click(screen.getByRole("button", { name: /Cambiar de sesión/ }));
    const menu = await screen.findByRole("menu", { name: "Sesiones" });
    await user.click(await within(menu).findByRole("menuitemradio", { name: /Anexo de seguros/ }));
    await screen.findByRole("button", { name: /Sesión activa: Anexo de seguros/ });

    expect(within(screen.getByRole("main")).queryAllByRole("heading").length).toBeGreaterThan(0);
  });
});
