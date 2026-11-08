import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DecisionsResult, SessionResult } from "../../services/engine/reviewTypes";
import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";
import { REVIEW } from "../../test/reviewFixtures";
import { SECOND_REVIEW, TWO_SESSIONS } from "../../test/sessionFixtures";

const ALL_DECIDED_IN_A: DecisionsResult = {
  decisions: [1, 2].map((alertNumber) => ({
    alertNumber,
    kind: "error" as const,
    correctSide: null,
    decidedAt: "2026-10-15T10:05:00+00:00",
  })),
  canUndo: true,
};

function pendingAnswer<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

async function switchToSecondSession(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /Cambiar de sesión/ }));
  const menu = await screen.findByRole("menu", { name: "Sesiones" });
  await user.click(await within(menu).findByRole("menuitemradio", { name: /Anexo de seguros/ }));
  await screen.findByRole("button", { name: /Sesión activa: Anexo de seguros/ });
}

function servicesWith(reviews: Parameters<typeof fakeEngineServices>[0]) {
  return fakeEngineServices({
    history: { history: vi.fn(() => Promise.resolve(TWO_SESSIONS)) },
    ...reviews,
  });
}

// Una respuesta que llega tarde pertenece a la sesión que la pidió, no a la que esté abierta.
describe("respuestas tardías de otra sesión", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("(regresión) las decisiones de A no se aplican a B si se cambió de sesión entretanto", async () => {
    const answer = pendingAnswer<DecisionsResult>();
    const decide = vi.fn(() => answer.promise);
    const openReview = vi.fn(() => Promise.resolve(SECOND_REVIEW));
    renderApp(servicesWith({ reviews: { decide, openReview } }), REVIEW);
    await act(() => Promise.resolve());
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /^Expediente/ }));
    const table = screen.getByRole("table", { name: "Lista de alertas" });
    await user.click(within(table).getAllByRole("row")[2] ?? table);
    await user.keyboard("e");
    expect(decide).toHaveBeenCalled();

    await switchToSecondSession(user);
    await act(async () => {
      answer.resolve(ALL_DECIDED_IN_A);
      await Promise.resolve();
    });

    const sidebar = within(screen.getByRole("navigation", { name: "Navegación principal" }));
    expect(sidebar.getByText("1 alerta pendiente de 1")).toBeInTheDocument();
  });

  it("(regresión) un cierre o un nombre nuevo de A no reemplaza la sesión B", async () => {
    const answer = pendingAnswer<SessionResult>();
    const openReview = vi.fn(() => Promise.resolve(SECOND_REVIEW));
    const closeReview = vi.fn(() => answer.promise);
    renderApp(servicesWith({ reviews: { openReview, closeReview } }), REVIEW);
    await act(() => Promise.resolve());
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /^Expediente/ }));
    await user.click(screen.getByRole("button", { name: /Cerrar revisión/ }));
    expect(closeReview).toHaveBeenCalledWith("s-1");

    await switchToSecondSession(user);
    await act(async () => {
      answer.resolve({ ...REVIEW.session, closedAt: "2026-10-15T11:00:00+00:00" });
      await Promise.resolve();
    });

    expect(screen.getByRole("button", { name: /Sesión activa: Anexo de seguros/ })).toBeVisible();
    // Tampoco lo saca de B para llevarlo al historial de A.
    expect(screen.queryByRole("heading", { level: 1, name: "Historial" })).not.toBeInTheDocument();
  });

  it("(regresión) si el cierre de A falla después de cambiar a B, B no ofrece reintentarlo", async () => {
    let reject: (error: Error) => void = () => undefined;
    const closeReview = vi.fn(
      () =>
        new Promise<SessionResult>((_, fail) => {
          reject = fail;
        }),
    );
    const openReview = vi.fn(() => Promise.resolve(SECOND_REVIEW));
    renderApp(servicesWith({ reviews: { openReview, closeReview } }), REVIEW);
    await act(() => Promise.resolve());
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /^Expediente/ }));
    await user.click(screen.getByRole("button", { name: /Cerrar revisión/ }));

    await switchToSecondSession(user);
    await act(async () => {
      reject(new Error("sin respuesta"));
      await Promise.resolve();
    });

    expect(screen.queryByText("No se pudo cerrar la revisión.")).not.toBeInTheDocument();
  });
});
