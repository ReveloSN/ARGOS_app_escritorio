import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fakeEngineServices } from "../../test/engineFakes";
import { confirmedFact, factsResult } from "../../test/factFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";
import { REVIEW } from "../../test/reviewFixtures";

describe("Acciones de cada dato confirmado", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("(regresión) cada botón dice de qué dato habla, para quien navega con lector de pantalla", async () => {
    const listFacts = () =>
      Promise.resolve(
        factsResult({
          facts: [
            confirmedFact({ id: 1, label: "Número de contrato" }),
            confirmedFact({
              id: 2,
              label: "Canon mensual",
              entityType: "money",
              value: "$ 5.000.000",
            }),
          ],
        }),
      );
    renderApp(fakeEngineServices({ facts: { listFacts } }), REVIEW);
    await act(() => Promise.resolve());
    await userEvent.click(screen.getByRole("button", { name: /^Expediente/ }));
    await userEvent.click(screen.getByRole("tab", { name: "Datos confirmados" }));

    expect(await screen.findByRole("button", { name: "Editar Número de contrato" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Retirar Canon mensual" })).toBeVisible();
  });
});
