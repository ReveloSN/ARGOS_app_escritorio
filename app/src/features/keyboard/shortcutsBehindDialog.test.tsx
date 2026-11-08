import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderApp, stubBrowser } from "../../test/renderApp";
import { REVIEW } from "../../test/reviewFixtures";
import { engineWithTwoSessions } from "../../test/sessionFixtures";

// Un diálogo modal es modal también para el teclado: E no decide la alerta que quedó detrás.
describe("atajos con un diálogo abierto", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("(regresión) con «Eliminar sesión» abierto, E no marca la alerta de atrás como error", async () => {
    const engine = engineWithTwoSessions();
    const decide = vi.fn(() => Promise.resolve({ decisions: [], canUndo: false }));
    Object.assign(engine.services.reviews, { decide });
    renderApp(engine.services, REVIEW);
    await act(() => Promise.resolve());
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /^Expediente/ }));
    const table = screen.getByRole("table", { name: "Lista de alertas" });
    await user.click(within(table).getAllByRole("row")[2] ?? table);

    await user.click(screen.getByRole("button", { name: /Cambiar de sesión/ }));
    const menu = await screen.findByRole("menu", { name: "Sesiones" });
    await user.click(within(menu).getByRole("menuitem", { name: "Eliminar" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    await user.keyboard("e");

    expect(decide).not.toHaveBeenCalled();
  });
});
