import { act, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { answering, SIGNED_IN, SIGNED_OUT } from "../../test/accountFakes";
import { fakeEngineServices, HEALTHY } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";
import type { PreferenceStorage } from "../../services/preferences/preferenceStorage";
import type { AccountStateResult } from "../../services/engine/accountTypes";

async function renderShell(state: AccountStateResult, storage?: PreferenceStorage) {
  const account = { account: answering(state), refresh: answering(state) };
  renderApp(fakeEngineServices({ account }), undefined, storage);
  await act(() => Promise.resolve());
}

function emptyStorage(): PreferenceStorage {
  const values = new Map<string, string>();
  return {
    read: (key) => values.get(key) ?? null,
    write: (key, value) => {
      values.set(key, value);
    },
  };
}

function layerOf(token: string): number {
  const css = readFileSync("src/design-tokens/global.css", "utf8");
  return Number(new RegExp(`--layer-${token}:\\s*(\\d+)`).exec(css)?.[1]);
}

describe("el fondo detrás de la puerta", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("con la puerta a la vista, toda la aplicación es inerte y la puerta queda fuera", async () => {
    await renderShell(SIGNED_OUT);

    const inert = document.querySelector("[inert]");
    expect(inert).not.toBeNull();
    expect(inert).toContainElement(
      screen.getByRole("navigation", { name: "Navegación principal" }),
    );
    expect(inert).toContainElement(screen.getByRole("main"));
    expect(inert).not.toContainElement(screen.getByRole("dialog"));
    expect(screen.getByRole("dialog").closest("[inert]")).toBeNull();
  });

  it("sin puerta, nada es inerte", async () => {
    await renderShell(SIGNED_IN);

    expect(document.querySelector("[inert]")).toBeNull();
  });

  it("si la puerta espera a otro diálogo, la aplicación sigue activa", async () => {
    const down = () => Promise.reject(new Error("sin motor"));
    const account = vi.fn().mockImplementationOnce(down).mockResolvedValue(SIGNED_OUT);
    const checkHealth = vi.fn().mockImplementationOnce(down).mockResolvedValue(HEALTHY);
    const services = fakeEngineServices({ account: { account }, checkHealth });
    renderApp(services, undefined, emptyStorage());
    await act(() => Promise.resolve());
    await act(() => services.statusMonitor.refresh());
    expect(account).toHaveBeenCalledTimes(2);

    expect(screen.getByRole("dialog", { name: /Cargue los documentos/ })).toBeVisible();
    expect(document.querySelector("[inert]")).toBeNull();
  });

  it("nada, ni los avisos, se pinta por encima de la puerta", () => {
    expect(layerOf("gate")).toBeGreaterThan(layerOf("toast"));
  });
});
