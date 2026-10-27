import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderApp, stubBrowser } from "../../test/renderApp";
import { REVIEW } from "../../test/reviewFixtures";
import { engineWithTwoSessions } from "../../test/sessionFixtures";
import { DELETION_UNDO_WINDOW_MS } from "./deletionQueue";

async function openSessionMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /Cambiar de sesión/ }));
  return screen.findByRole("menu", { name: "Sesiones" });
}

async function askToDelete(user: ReturnType<typeof userEvent.setup>) {
  const menu = await openSessionMenu(user);
  await user.click(within(menu).getByRole("menuitem", { name: "Eliminar" }));
  return screen.getByRole("dialog", { name: /¿Eliminar la sesión «Revisión de prueba»\?/ });
}

describe("Renombrar y eliminar la sesión activa", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("«Renombrar» guarda el nombre y lo muestra en toda la app", async () => {
    const engine = engineWithTwoSessions();
    renderApp(engine.services, REVIEW);
    const user = userEvent.setup();

    const menu = await openSessionMenu(user);
    await user.click(within(menu).getByRole("menuitem", { name: "Renombrar" }));
    const dialog = screen.getByRole("dialog", { name: "Renombrar la sesión" });
    const field = within(dialog).getByLabelText("Nombre de la sesión");
    await user.clear(field);
    await user.type(field, "Contrato firmado");
    await user.click(within(dialog).getByRole("button", { name: "Guardar nombre" }));

    expect(engine.renameReview).toHaveBeenCalledWith("s-1", "Contrato firmado");
    const renamed = await screen.findByRole("button", { name: /Sesión activa: Contrato firmado/ });
    expect(renamed).toBeVisible();
    expect(within(screen.getByRole("navigation")).getByText("Contrato firmado")).toBeVisible();
  });

  it("(regresión) al abrir «Renombrar» el foco está en el campo y, al cerrar, vuelve al selector", async () => {
    renderApp(engineWithTwoSessions().services, REVIEW);
    const user = userEvent.setup();
    const trigger = screen.getByRole("button", { name: /Cambiar de sesión/ });

    const menu = await openSessionMenu(user);
    await user.click(within(menu).getByRole("menuitem", { name: "Renombrar" }));
    const dialog = screen.getByRole("dialog", { name: "Renombrar la sesión" });

    expect(within(dialog).getByLabelText("Nombre de la sesión")).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(trigger).toHaveFocus();
    });
  });

  it("«Eliminar» pide confirmación y permite deshacer antes de borrar", async () => {
    const engine = engineWithTwoSessions();
    renderApp(engine.services, REVIEW);
    const user = userEvent.setup();

    const dialog = await askToDelete(user);
    await user.click(within(dialog).getByRole("button", { name: "Eliminar sesión" }));

    expect(screen.getByText("Sesión «Revisión de prueba» eliminada")).toBeVisible();
    // Queda otra sesión guardada en el historial: Inicio lo dice en lugar de «no hay revisiones».
    expect(
      await screen.findByRole("heading", { name: "No hay una revisión abierta" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Deshacer/ }));

    expect(within(screen.getByRole("main")).getByText("Revisión de prueba")).toBeInTheDocument();
    expect(engine.deleteReview).not.toHaveBeenCalled();
  });

  it("vencido el plazo para deshacer, el motor borra la sesión", async () => {
    const engine = engineWithTwoSessions();
    renderApp(engine.services, REVIEW);
    const user = userEvent.setup();
    await askToDelete(user);
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: "Eliminar sesión" }));
    expect(engine.deleteReview).not.toHaveBeenCalled();

    await act(() => vi.advanceTimersByTimeAsync(DELETION_UNDO_WINDOW_MS));

    expect(engine.deleteReview).toHaveBeenCalledWith("s-1");
  });

  it("cancelar la confirmación no elimina nada", async () => {
    const engine = engineWithTwoSessions();
    renderApp(engine.services, REVIEW);
    const user = userEvent.setup();

    await askToDelete(user);
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(engine.deleteReview).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Cambiar de sesión/ })).toBeInTheDocument();
  });
});
