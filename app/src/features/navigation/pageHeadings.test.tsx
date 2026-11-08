import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";

const SECTIONS = [
  "Inicio",
  "Expediente",
  "Comparar",
  "Revisar antes de enviar",
  "Historial",
  "Ajustes",
];

// WCAG 1.3.1 / 2.4.6: cada pantalla se anuncia con un único título de nivel 1, aunque esté vacía.
describe("títulos de página", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each(SECTIONS)("«%s» tiene exactamente un título de nivel 1", async (section) => {
    renderApp(fakeEngineServices());
    await act(() => Promise.resolve());
    const navigation = screen.getByRole("navigation", { name: "Navegación principal" });

    await userEvent.click(within(navigation).getByRole("button", { name: section }));

    expect(await screen.findAllByRole("heading", { level: 1 })).toHaveLength(1);
  });
});
