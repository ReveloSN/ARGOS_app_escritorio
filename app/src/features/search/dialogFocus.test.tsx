import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";
import { REVIEW } from "../../test/reviewFixtures";

describe("Foco de la búsqueda global", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("(regresión) Tab no saca el foco del diálogo y al cerrarlo vuelve a quien lo abrió", async () => {
    renderApp(
      fakeEngineServices({ documents: { searchDocuments: () => Promise.resolve([]) } }),
      REVIEW,
    );
    await act(() => Promise.resolve());
    const opener = screen.getByRole("button", { name: /^Expediente/ });
    await userEvent.click(opener);

    await userEvent.keyboard("{Control>}k{/Control}");
    const dialog = await screen.findByRole("dialog");
    await userEvent.tab();
    await userEvent.tab({ shift: true });

    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    await userEvent.keyboard("{Escape}");
    await vi.waitFor(() => {
      expect(opener).toHaveFocus();
    });
  });
});
