import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fakeEngineServices } from "../../test/engineFakes";
import { HISTORY } from "../../test/historyFixtures";
import { renderApp, stubBrowser } from "../../test/renderApp";
import { CLOSED_REVIEW } from "../../test/reviewFixtures";

describe("Historial cuando una sesión no se puede abrir", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("(regresión) lo explica y permite reintentar, en vez de recargar la lista en silencio", async () => {
    const openReview = vi
      .fn<(id: string) => Promise<typeof CLOSED_REVIEW>>()
      .mockResolvedValueOnce(CLOSED_REVIEW)
      .mockRejectedValueOnce(new Error("sin respuesta"))
      .mockResolvedValue(CLOSED_REVIEW);
    const history = vi.fn(() => Promise.resolve(HISTORY));
    renderApp(fakeEngineServices({ history: { history }, reviews: { openReview } }));
    await act(() => Promise.resolve());
    await userEvent.click(screen.getByRole("button", { name: /Historial/ }));
    await screen.findByRole("complementary", { name: "Decisiones de la sesión" });

    const table = await screen.findByRole("table", { name: "Sesiones del historial" });
    await userEvent.dblClick(within(table).getByText("Revisión de prueba"));

    expect(await screen.findByText("No pudimos abrir esta sesión.")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("table", { name: "Lista de alertas" })).toBeInTheDocument();
  });
});
