import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";
import { CLOSED_REVIEW } from "../../test/reviewFixtures";

describe("Del expediente a Comparar", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("el encabezado del expediente tiene «Comparar» y abre Comparar con los documentos del expediente", async () => {
    renderApp(fakeEngineServices(), CLOSED_REVIEW);
    await act(() => Promise.resolve());
    await userEvent.click(screen.getByRole("button", { name: /^Expediente/ }));

    const main = within(screen.getByRole("main"));
    await userEvent.click(main.getByRole("button", { name: "Comparar" }));

    expect(
      await screen.findByRole("heading", { level: 2, name: "Documentos del expediente" }),
    ).toBeInTheDocument();
  });
});
