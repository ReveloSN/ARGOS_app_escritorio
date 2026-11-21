import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { HistoryResult } from "../../services/engine/historyTypes";
import { fakeEngineServices } from "../../test/engineFakes";
import { HISTORY } from "../../test/historyFixtures";
import { renderApp, stubBrowser } from "../../test/renderApp";
import { CLOSED_REVIEW } from "../../test/reviewFixtures";

const SESSION_COUNT = 8;
const MANY: HistoryResult = {
  ...HISTORY,
  sessions: Array.from({ length: SESSION_COUNT }, (_, index) =>
    HISTORY.sessions.slice(0, 1).map((session) => ({
      ...session,
      id: `s-${String(index + 1)}`,
      name: `Sesión ${String(index + 1)}`,
    })),
  ).flat(),
};

// Ventanas bajas: la lista no debe quedar recortada por el detalle; con el teclado se recorre entera.
describe("Historial con el teclado", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("las flechas recorren todas las sesiones y el detalle sigue a la elegida", async () => {
    const openReview = vi.fn((id: string) =>
      Promise.resolve({ ...CLOSED_REVIEW, session: { ...CLOSED_REVIEW.session, id } }),
    );
    const history = vi.fn(() => Promise.resolve(MANY));
    renderApp(fakeEngineServices({ history: { history }, reviews: { openReview } }));
    await act(() => Promise.resolve());
    await userEvent.click(screen.getByRole("button", { name: /Historial/ }));
    const table = await screen.findByRole("table", { name: "Sesiones del historial" });
    const rows = within(table).getAllByRole("row").slice(1);
    rows[0]?.focus();

    for (let step = 1; step < SESSION_COUNT; step += 1) {
      await userEvent.keyboard("{ArrowDown}");
    }

    const last = rows[SESSION_COUNT - 1];
    expect(last).toHaveFocus();
    expect(last).toHaveAttribute("aria-selected", "true");
    expect(openReview).toHaveBeenLastCalledWith(`s-${String(SESSION_COUNT)}`);
    expect(
      await screen.findByRole("complementary", { name: "Decisiones de la sesión" }),
    ).toBeInTheDocument();
  });
});
