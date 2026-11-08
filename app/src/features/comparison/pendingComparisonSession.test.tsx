import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ComparisonResult } from "../../services/engine/comparisonTypes";
import { comparison } from "../../test/comparisonFakes";
import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";
import { REVIEW } from "../../test/reviewFixtures";
import { SECOND_REVIEW, TWO_SESSIONS } from "../../test/sessionFixtures";

describe("Comparación en curso al cambiar de sesión", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("(regresión) lo que se comparaba en A no aparece bajo B ni deja el avance colgado", async () => {
    let finish: (result: ComparisonResult) => void = () => undefined;
    const startComparison = vi.fn(
      () =>
        new Promise<ComparisonResult>((resolve) => {
          finish = resolve;
        }),
    );
    renderApp(
      fakeEngineServices({
        history: { history: vi.fn(() => Promise.resolve(TWO_SESSIONS)) },
        reviews: { openReview: vi.fn(() => Promise.resolve(SECOND_REVIEW)) },
        comparisons: { startComparison },
      }),
      REVIEW,
    );
    await act(() => Promise.resolve());
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Comparar" }));
    await user.upload(screen.getByLabelText("Elegir documentos"), [
      new File(["a"], "v1.docx"),
      new File(["b"], "v2.docx"),
    ]);
    expect(startComparison).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /Cambiar de sesión/ }));
    const menu = await screen.findByRole("menu", { name: "Sesiones" });
    await user.click(await within(menu).findByRole("menuitemradio", { name: /Anexo de seguros/ }));
    await screen.findByRole("button", { name: /Sesión activa: Anexo de seguros/ });
    await act(async () => {
      finish(comparison());
      await Promise.resolve();
    });

    expect(screen.queryByRole("heading", { name: "Comparar documentos" })).not.toBeInTheDocument();
    expect(screen.getByText("Elija dos o más documentos")).toBeInTheDocument();
  });
});
