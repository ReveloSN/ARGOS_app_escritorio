import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";
import { REVIEW } from "../../test/reviewFixtures";

const LONG_NAME = "Contrato de prestación de servicios con ACME S.A.S. y anexos de pago 2026";

describe("Encabezado del expediente", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("ofrece el nombre completo de la sesión aunque el título lo recorte", async () => {
    const review = { ...REVIEW, session: { ...REVIEW.session, name: LONG_NAME } };
    renderApp(fakeEngineServices(), review);
    await act(() => Promise.resolve());

    await userEvent.click(screen.getByRole("button", { name: /^Expediente/ }));

    expect(screen.getByRole("heading", { level: 1 })).toHaveAttribute("title", LONG_NAME);
  });
});
