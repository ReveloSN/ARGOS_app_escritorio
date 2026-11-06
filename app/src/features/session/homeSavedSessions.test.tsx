import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";
import { TWO_SESSIONS } from "../../test/sessionFixtures";

describe("Inicio sin sesión abierta", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("(regresión) no dice que no hay revisiones si el historial las tiene guardadas", async () => {
    const history = vi.fn(() => Promise.resolve(TWO_SESSIONS));
    renderApp(fakeEngineServices({ history: { history } }));
    await act(() => Promise.resolve());

    const home = within(screen.getByRole("main"));
    expect(
      await home.findByRole("heading", { name: "No hay una revisión abierta" }),
    ).toBeInTheDocument();
    expect(home.getByText(/2 revisiones guardadas/)).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Todavía no hay revisiones" }),
    ).not.toBeInTheDocument();
  });

  it("lleva al Historial para abrir una revisión guardada", async () => {
    const history = vi.fn(() => Promise.resolve(TWO_SESSIONS));
    renderApp(fakeEngineServices({ history: { history } }));
    await act(() => Promise.resolve());

    await userEvent.click(
      await within(screen.getByRole("main")).findByRole("button", { name: "Ver el historial" }),
    );

    expect(await screen.findByRole("heading", { name: "Historial" })).toBeInTheDocument();
  });

  it("sin nada guardado conserva el estado vacío de siempre", async () => {
    const history = vi.fn(() =>
      Promise.resolve({ ...TWO_SESSIONS, sessions: [] as typeof TWO_SESSIONS.sessions }),
    );
    renderApp(fakeEngineServices({ history: { history } }));
    await act(() => Promise.resolve());

    expect(
      await screen.findByRole("heading", { name: "Todavía no hay revisiones" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ver el historial" })).not.toBeInTheDocument();
  });
});
