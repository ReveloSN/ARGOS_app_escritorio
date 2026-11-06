import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { comparison } from "../../test/comparisonFakes";
import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";
import { REVIEW } from "../../test/reviewFixtures";
import { SECOND_REVIEW, TWO_SESSIONS } from "../../test/sessionFixtures";

function engineWithComparison() {
  return fakeEngineServices({
    history: { history: vi.fn(() => Promise.resolve(TWO_SESSIONS)) },
    reviews: { openReview: vi.fn(() => Promise.resolve(SECOND_REVIEW)) },
    comparisons: { startComparison: vi.fn(() => Promise.resolve(comparison())) },
  });
}

async function compareTwoFiles() {
  await userEvent.click(screen.getByRole("button", { name: "Comparar" }));
  await userEvent.upload(screen.getByLabelText("Elegir documentos"), [
    new File(["a"], "v1.docx"),
    new File(["b"], "v2.docx"),
  ]);
  await screen.findByRole("heading", { name: "Comparar documentos" });
}

describe("Comparar sigue a la sesión activa", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("(regresión) al cambiar de sesión, Comparar vuelve a pedir qué comparar", async () => {
    renderApp(engineWithComparison(), REVIEW);
    await act(() => Promise.resolve());
    await compareTwoFiles();

    await userEvent.click(screen.getByRole("button", { name: /Cambiar de sesión/ }));
    const menu = await screen.findByRole("menu", { name: "Sesiones" });
    await userEvent.click(
      await within(menu).findByRole("menuitemradio", { name: /Anexo de seguros/ }),
    );

    expect(await screen.findByText("Elija dos o más documentos")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Comparar documentos" })).not.toBeInTheDocument();
  });
});
