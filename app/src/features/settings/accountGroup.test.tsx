import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { answering, SIGNED_IN, UNAVAILABLE_ACCOUNT } from "../../test/accountFakes";
import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";

function searchField() {
  return within(screen.getByRole("dialog")).getByRole("combobox");
}

async function openSettings(state: typeof SIGNED_IN) {
  const account = { account: answering(state), refresh: answering(state) };
  renderApp(fakeEngineServices({ account }));
  await act(() => Promise.resolve());
  await userEvent.click(screen.getByRole("button", { name: /Ajustes/ }));
  return screen.getByRole("main");
}

describe("Ajustes: Cuenta", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("tiene su propio grupo, con una descripción que no promete lo que no cumple", async () => {
    const page = await openSettings(SIGNED_IN);

    const group = within(page).getByRole("region", { name: "Su cuenta" });
    const application = within(page).getByRole("region", { name: "Esta aplicación" });
    expect(within(group).getByRole("region", { name: "Cuenta" })).toBeVisible();
    expect(within(application).queryByRole("region", { name: "Cuenta" })).toBeNull();
    expect(group).toHaveTextContent(/servicio de cuentas/);
    expect(group).not.toHaveTextContent(/aunque el motor no responda/);
  });

  it("Ctrl K en Ajustes ofrece Cuenta solo si existe", async () => {
    await openSettings(SIGNED_IN);
    await userEvent.keyboard("{Control>}k{/Control}");
    await userEvent.type(searchField(), "Cuen");
    expect(await screen.findByRole("option", { name: /Cuenta/ })).toBeVisible();
  });

  it("sin cuenta configurada, Ctrl K no ofrece Cuenta", async () => {
    await openSettings(UNAVAILABLE_ACCOUNT);
    await userEvent.keyboard("{Control>}k{/Control}");
    await userEvent.type(searchField(), "Cuen");

    await act(() => new Promise((done) => setTimeout(done, 400)));

    expect(screen.queryByRole("option", { name: /Cuenta/ })).toBeNull();
  });
});
