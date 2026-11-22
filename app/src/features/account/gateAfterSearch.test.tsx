import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SIGNED_OUT } from "../../test/accountFakes";
import type { AccountStateResult } from "../../services/engine/accountTypes";
import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";

const later = () => new Promise((done) => setTimeout(done, 30));

describe("la puerta que esperaba a la búsqueda", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function openSearchThenResolveAccount() {
    let resolve: (state: AccountStateResult) => void = () => undefined;
    const account = () => new Promise<AccountStateResult>((done) => (resolve = done));
    renderApp(fakeEngineServices({ account: { account } }));
    await userEvent.click(screen.getByRole("button", { name: /Ajustes/ }));
    await userEvent.keyboard("{Control>}k{/Control}");
    await act(async () => {
      resolve(SIGNED_OUT);
      await later();
    });
  }

  it("termina con el foco en el primer campo, no en la aplicación ni en omitir", async () => {
    await openSearchThenResolveAccount();
    expect(screen.queryByLabelText("Correo electrónico")).not.toBeInTheDocument();

    await userEvent.keyboard("{Escape}");
    await act(later);

    expect(document.activeElement).toBe(screen.getByLabelText("Correo electrónico"));
  });

  it("al cerrarse, devuelve el foco a un elemento vivo de la aplicación", async () => {
    await openSearchThenResolveAccount();
    await userEvent.keyboard("{Escape}");
    await act(later);

    await userEvent.keyboard("{Escape}");
    await act(later);

    const active = document.activeElement;
    expect(active).not.toBe(document.body);
    expect(screen.getByRole("main").parentElement?.contains(active)).toBe(true);
  });

  it("el mismo Esc que cierra la búsqueda queda atendido y no cierra la puerta", async () => {
    await openSearchThenResolveAccount();
    const escape = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });

    await act(async () => {
      within(screen.getByRole("dialog")).getByRole("combobox").dispatchEvent(escape);
      await later();
    });

    expect(escape.defaultPrevented).toBe(true);
    expect(screen.getByLabelText("Correo electrónico")).toBeVisible();
    expect(document.activeElement).toBe(screen.getByLabelText("Correo electrónico"));
  });
});
