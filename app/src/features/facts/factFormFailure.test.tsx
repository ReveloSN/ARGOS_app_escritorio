import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EngineRejectedError } from "../../services/engine/engineHttp";
import { fakeEngineServices } from "../../test/engineFakes";
import { factsResult } from "../../test/factFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";
import { REVIEW } from "../../test/reviewFixtures";

describe("«Agregar dato» cuando el motor no reconoce el valor", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("(regresión) conserva lo escrito para corregirlo y solo se cierra al guardarse", async () => {
    const addFact = vi
      .fn()
      .mockRejectedValueOnce(new EngineRejectedError("/facts", "unrecognized_fact_value"))
      .mockResolvedValue(factsResult({ pending: [], canUndo: true }));
    renderApp(
      fakeEngineServices({
        facts: {
          listFacts: () => Promise.resolve({ facts: [], pending: [], canUndo: false }),
          addFact,
        },
      }),
      REVIEW,
    );
    await act(() => Promise.resolve());
    await userEvent.click(screen.getByRole("button", { name: /^Expediente/ }));
    await userEvent.click(screen.getByRole("tab", { name: "Datos confirmados" }));
    await userEvent.click(
      (await screen.findAllByRole("button", { name: "Agregar dato" }))[0] ?? document.body,
    );
    await userEvent.type(screen.getByRole("textbox", { name: "Nombre del dato" }), "Número");
    await userEvent.type(screen.getByRole("textbox", { name: "Valor confirmado" }), "abc{Enter}");

    expect(await screen.findByText(/no se reconoce como un valor/)).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Nombre del dato" })).toHaveValue("Número");
    expect(screen.getByRole("textbox", { name: "Valor confirmado" })).toHaveValue("abc");

    await userEvent.clear(screen.getByRole("textbox", { name: "Valor confirmado" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Valor confirmado" }), "4857{Enter}");

    expect(await screen.findByText("Se guardó «Número»: 4857")).toBeVisible();
    expect(screen.queryByRole("textbox", { name: "Valor confirmado" })).not.toBeInTheDocument();
  });
});
