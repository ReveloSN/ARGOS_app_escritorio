import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AiSettingsResult } from "../../services/engine/aiTypes";
import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";

const PROVIDERS = [
  { id: "anthropic" as const, model: "claude-sonnet-5-5" },
  { id: "deepseek" as const, model: "deepseek-flash" },
];
const OFF: AiSettingsResult = {
  explainsChanges: false,
  provider: "anthropic",
  model: "claude-sonnet-5-5",
  hasKey: false,
  isKeychainAvailable: true,
  providers: PROVIDERS,
};
const DEEPSEEK: AiSettingsResult = { ...OFF, provider: "deepseek", model: "deepseek-flash" };

async function openSettings(ai: Parameters<typeof fakeEngineServices>[0]) {
  renderApp(fakeEngineServices(ai));
  await act(() => Promise.resolve());
  await userEvent.click(screen.getByRole("button", { name: /Ajustes/ }));
}

describe("Ajustes > Inteligencia artificial", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("viene apagada y se activa con consentimiento explícito", async () => {
    const setExplainsChanges = vi.fn(() => Promise.resolve({ ...OFF, explainsChanges: true }));
    await openSettings({ ai: { aiSettings: () => Promise.resolve(OFF), setExplainsChanges } });

    const toggle = await screen.findByRole("switch", { name: "Explicar cambios con IA" });
    expect(toggle).not.toBeChecked();
    expect(screen.getByText(/modelo claude-sonnet-5-5/)).toBeInTheDocument();
    await userEvent.click(toggle);

    expect(setExplainsChanges).toHaveBeenCalledWith(true);
    expect(await screen.findByRole("switch", { name: "Explicar cambios con IA" })).toBeChecked();
  });

  it("guarda la clave en el llavero sin mostrarla y permite quitarla", async () => {
    const stored = { ...OFF, hasKey: true };
    const storeKey = vi.fn(() => Promise.resolve(stored));
    const removeKey = vi.fn(() => Promise.resolve(OFF));
    await openSettings({ ai: { aiSettings: () => Promise.resolve(OFF), storeKey, removeKey } });

    const input = await screen.findByLabelText("Clave de la API de Anthropic");
    expect(input).toHaveAttribute("type", "password");
    await userEvent.type(input, "clave-de-prueba");
    await userEvent.click(screen.getByRole("button", { name: "Guardar clave" }));

    expect(storeKey).toHaveBeenCalledWith("clave-de-prueba");
    expect(
      await screen.findByText("Clave guardada en el llavero del sistema."),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Quitar clave" }));
    expect(removeKey).toHaveBeenCalled();
  });

  it("cambia de proveedor y pide la clave de ese proveedor", async () => {
    const setProvider = vi.fn(() => Promise.resolve(DEEPSEEK));
    await openSettings({ ai: { aiSettings: () => Promise.resolve(OFF), setProvider } });

    await userEvent.selectOptions(await screen.findByLabelText("Proveedor de IA"), "deepseek");

    expect(setProvider).toHaveBeenCalledWith("deepseek");
    expect(await screen.findByLabelText("Clave de la API de DeepSeek")).toBeInTheDocument();
    expect(screen.getByText(/modelo deepseek-flash/)).toBeInTheDocument();
  });

  it("sin llavero explica qué pasó, por qué y qué hacer", async () => {
    const noKeychain = { ...OFF, isKeychainAvailable: false };
    await openSettings({ ai: { aiSettings: () => Promise.resolve(noKeychain) } });

    expect(await screen.findByText("No se puede usar el llavero del sistema.")).toBeInTheDocument();
    expect(screen.getByText(/Secret Service/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Reintentar" }).length).toBeGreaterThan(0);
  });
});
