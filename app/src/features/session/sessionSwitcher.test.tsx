import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderApp, stubBrowser } from "../../test/renderApp";
import { REVIEW } from "../../test/reviewFixtures";
import { engineWithTwoSessions } from "../../test/sessionFixtures";

async function openSessionMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /Cambiar de sesión/ }));
  return screen.findByRole("menu", { name: "Sesiones" });
}

describe("Selector de sesión", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("la flecha despliega las sesiones con sus datos y marca la activa con ícono", async () => {
    renderApp(engineWithTwoSessions().services, REVIEW);
    const user = userEvent.setup();

    const menu = await openSessionMenu(user);

    const active = await within(menu).findByRole("menuitemradio", { name: /Revisión de prueba/ });
    const other = within(menu).getByRole("menuitemradio", { name: /Anexo de seguros/ });
    expect(active).toHaveAttribute("aria-checked", "true");
    expect(other).toHaveAttribute("aria-checked", "false");
    expect(active).toHaveTextContent("3 documentos · 2 alertas pendientes · 15/10/2026");
    expect(active).toHaveTextContent("check_circle");
    expect(other).toHaveTextContent("radio_button_unchecked");
    for (const name of ["Nueva sesión", "Renombrar", "Eliminar"]) {
      expect(within(menu).getByRole("menuitem", { name })).toBeInTheDocument();
    }
  });

  it("al cambiar de sesión se recarga todo: barra lateral, Inicio y la barra superior", async () => {
    const engine = engineWithTwoSessions();
    renderApp(engine.services, REVIEW);
    const user = userEvent.setup();
    const sidebar = within(screen.getByRole("navigation"));
    expect(sidebar.getByText("2 alertas pendientes de 2")).toBeInTheDocument();

    const menu = await openSessionMenu(user);
    await user.click(await within(menu).findByRole("menuitemradio", { name: /Anexo de seguros/ }));

    expect(engine.openReview).toHaveBeenCalledWith("s-2");
    expect(await sidebar.findByText("1 alerta pendiente de 1")).toBeInTheDocument();
    const home = within(screen.getByRole("main"));
    expect(home.getByText("Anexo de seguros")).toBeInTheDocument();
    expect(home.getByText("1 documento cargado")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sesión activa: Anexo de seguros/ })).toBeVisible();
  });

  it("se maneja con el teclado: Enter abre, flechas mueven y Esc cierra", async () => {
    renderApp(engineWithTwoSessions().services, REVIEW);
    const user = userEvent.setup();
    const trigger = screen.getByRole("button", { name: /Cambiar de sesión/ });

    trigger.focus();
    await user.keyboard("{Enter}");
    const menu = await screen.findByRole("menu", { name: "Sesiones" });
    const items = [...menu.querySelectorAll("button")];
    await waitFor(() => {
      expect(items[0]).toHaveFocus();
    });
    await user.keyboard("{ArrowDown}");
    expect(items[1]).toHaveFocus();
    await user.keyboard("{ArrowUp}{ArrowUp}");
    expect(items[items.length - 1]).toHaveFocus();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("«Nueva sesión» abre el asistente de una revisión nueva", async () => {
    renderApp(engineWithTwoSessions().services, REVIEW);
    const user = userEvent.setup();

    const menu = await openSessionMenu(user);
    await user.click(within(menu).getByRole("menuitem", { name: "Nueva sesión" }));

    expect(await screen.findByLabelText("Nombre de la sesión")).toBeInTheDocument();
  });
});
