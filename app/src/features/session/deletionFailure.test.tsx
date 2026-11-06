import { act, fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderApp, stubBrowser } from "../../test/renderApp";
import { REVIEW } from "../../test/reviewFixtures";
import { engineWithTwoSessions } from "../../test/sessionFixtures";
import { DELETION_UNDO_WINDOW_MS } from "./deletionQueue";

describe("Eliminar una sesión cuando el motor no responde", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("(regresión) lo dice en 3 partes: la sesión sigue guardada y cómo volver a intentarlo", async () => {
    const engine = engineWithTwoSessions();
    engine.deleteReview.mockRejectedValue(new Error("sin respuesta"));
    renderApp(engine.services, REVIEW);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Cambiar de sesión/ }));
    const menu = await screen.findByRole("menu", { name: "Sesiones" });
    await user.click(within(menu).getByRole("menuitem", { name: "Eliminar" }));
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: "Eliminar sesión" }));

    await act(() => vi.advanceTimersByTimeAsync(DELETION_UNDO_WINDOW_MS));

    expect(screen.getByText("No pudimos eliminar la sesión «Revisión de prueba».")).toBeVisible();
    expect(screen.getByText(/la sesión sigue guardada/)).toBeVisible();
    expect(screen.getByText(/elimínela de nuevo/i)).toBeVisible();
  });
});
