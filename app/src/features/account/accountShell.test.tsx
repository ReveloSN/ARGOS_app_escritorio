import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AccountStateResult } from "../../services/engine/accountTypes";
import type { PreferenceStorage } from "../../services/preferences/preferenceStorage";
import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";
import {
  answering,
  EXPIRED,
  SIGNED_IN,
  SIGNED_OUT,
  UNAVAILABLE_ACCOUNT,
} from "../../test/accountFakes";

function memoryStorage(): PreferenceStorage {
  const values = new Map<string, string>();
  return {
    read: (key) => values.get(key) ?? null,
    write: (key, value) => {
      values.set(key, value);
    },
  };
}

async function renderShell(state: AccountStateResult, storage?: PreferenceStorage) {
  const account = { account: answering(state), refresh: answering(state) };
  renderApp(fakeEngineServices({ account }), undefined, storage);
  await act(() => Promise.resolve());
}

const sidebar = () => screen.getByRole("navigation", { name: "Navegación principal" });

describe("la cuenta en la aplicación", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("el pie de la barra lateral muestra las iniciales y el nombre, y contraída solo las iniciales", async () => {
    await renderShell(SIGNED_IN);

    expect(within(sidebar()).getByText("AP")).toBeInTheDocument();
    expect(within(sidebar()).getByText("Ana Pérez")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: /Contraer/ }));

    expect(within(sidebar()).queryByText("Ana Pérez")).not.toBeInTheDocument();
    expect(within(sidebar()).getByRole("img", { name: "Cuenta: Ana Pérez" })).toBeVisible();
  });

  it("sin nombre usa el correo, y vencida lo dice sin bloquear", async () => {
    await renderShell({
      ...SIGNED_IN,
      account: { id: "1", email: "luz@correo.co", displayName: null },
    });
    expect(within(sidebar()).getByText("luz@correo.co")).toBeVisible();
    expect(within(sidebar()).getByText("L")).toBeInTheDocument();
  });

  it("con la sesión vencida, el pie conserva el correo y avisa", async () => {
    await renderShell(EXPIRED);

    expect(within(sidebar()).getByText("Sesión vencida")).toBeVisible();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("al cerrar una sesión vencida se van el correo y el pie", async () => {
    const account = { account: answering(EXPIRED), signOut: answering(SIGNED_OUT) };
    renderApp(fakeEngineServices({ account }));
    await act(() => Promise.resolve());
    await userEvent.click(screen.getByRole("button", { name: /Ajustes/ }));

    await userEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    expect(screen.queryByText(/ana@correo\.co/)).not.toBeInTheDocument();
    expect(screen.queryByText("Sesión vencida")).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /^Cuenta/ })).not.toBeInTheDocument();
  });

  it("con `unavailable` no hay pie ni sección de cuenta", async () => {
    await renderShell(UNAVAILABLE_ACCOUNT);
    await userEvent.click(screen.getByRole("button", { name: /Ajustes/ }));

    expect(within(sidebar()).queryByRole("img", { name: /Cuenta/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Cuenta" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cuenta" })).not.toBeInTheDocument();
  });

  it("con cuenta, Ajustes tiene la sección Cuenta en el índice y en la página", async () => {
    await renderShell(SIGNED_IN);
    await userEvent.click(screen.getByRole("button", { name: /Ajustes/ }));

    expect(screen.getByRole("region", { name: "Cuenta" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Cuenta" })).toBeVisible();
  });

  it("con la puerta abierta, los atajos de la pantalla no responden", async () => {
    await renderShell(SIGNED_OUT);

    await userEvent.keyboard("{Control>}n{/Control}");

    expect(screen.getByRole("dialog", { name: "Iniciar sesión" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Nueva revisión" })).not.toBeInTheDocument();
  });

  it("los Primeros pasos esperan a que la puerta se cierre", async () => {
    await renderShell(SIGNED_OUT, memoryStorage());

    expect(screen.getByRole("dialog", { name: "Iniciar sesión" })).toBeVisible();
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    await userEvent.keyboard("{Escape}");

    expect(screen.getByRole("dialog", { name: /Cargue los documentos/ })).toBeVisible();
  });

  it("Tab da la vuelta dentro de la puerta", async () => {
    await renderShell(SIGNED_OUT);
    const dialog = screen.getByRole("dialog");

    const skip = within(dialog).getByRole("button", { name: "Continuar sin cuenta" });
    skip.focus();
    await userEvent.tab();
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    await userEvent.tab({ shift: true });

    expect(document.activeElement).toBe(skip);
  });
});
