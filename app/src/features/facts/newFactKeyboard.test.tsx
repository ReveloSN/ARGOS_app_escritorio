import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";
import { REVIEW } from "../../test/reviewFixtures";

describe("«Agregar dato» con teclado", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("(regresión) la fila nueva abre con el foco en el nombre y Esc la cierra desde cualquier campo", async () => {
    const listFacts = () => Promise.resolve({ facts: [], pending: [], canUndo: false });
    renderApp(fakeEngineServices({ facts: { listFacts } }), REVIEW);
    await act(() => Promise.resolve());
    await userEvent.click(screen.getByRole("button", { name: /^Expediente/ }));
    await userEvent.click(screen.getByRole("tab", { name: "Datos confirmados" }));
    await userEvent.click(
      (await screen.findAllByRole("button", { name: "Agregar dato" }))[0] ?? document.body,
    );

    expect(screen.getByRole("textbox", { name: "Nombre del dato" })).toHaveFocus();
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("textbox", { name: "Nombre del dato" })).not.toBeInTheDocument();
  });
});
