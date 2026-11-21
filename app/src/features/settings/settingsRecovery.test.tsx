import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { EngineHealth } from "../../services/engine/engineClient";
import { EngineNotReadyError } from "../../services/engine/engineHttp";
import type { AiSettingsResult } from "../../services/engine/aiTypes";
import type { OcrSettingsResult } from "../../services/engine/ocrTypes";
import type { PreferencesResult } from "../../services/engine/preferencesTypes";
import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";

const OFF: AiSettingsResult = {
  explainsChanges: false,
  provider: "anthropic",
  model: "claude-sonnet-5-5",
  hasKey: false,
  isKeychainAvailable: true,
  providers: [{ id: "anthropic", model: "claude-sonnet-5-5" }],
};
const LOCAL: OcrSettingsResult = {
  isLocalAvailable: true,
  usesCloud: false,
  projectId: "",
  location: "",
  processorId: "",
  hasCredentials: false,
  isKeychainAvailable: true,
  isCloudReady: false,
};
const PREFERENCES: PreferencesResult = {
  sensitivity: "balanced",
  comparedCategories: ["amounts"],
  hasRetentionLimit: true,
  historyFolder: "ARGUS",
  suppressionRules: [],
};
const STARTUP_FAILURE = new Error("sin respuesta mientras arranca");

/** El motor arranca: /health dice «arrancando» hasta que la prueba lo da por listo. */
function startingEngine() {
  const engine = { isReady: false };
  const checkHealth = vi.fn((): Promise<EngineHealth> =>
    engine.isReady
      ? Promise.resolve({ status: "ok", version: "test" })
      : Promise.reject(new EngineNotReadyError(true)),
  );
  return { engine, checkHealth };
}

async function openSettingsWhileStarting(options: {
  readonly aiSettings: () => Promise<AiSettingsResult>;
}) {
  const { engine, checkHealth } = startingEngine();
  const preferences = vi.fn(() => Promise.resolve(PREFERENCES));
  const ocrSettings = vi.fn(() => Promise.resolve(LOCAL));
  const services = fakeEngineServices({
    checkHealth,
    preferences: { preferences },
    ai: { aiSettings: options.aiSettings },
    ocr: { ocrSettings },
  });
  renderApp(services);
  await act(() => Promise.resolve());
  await userEvent.click(screen.getByRole("button", { name: /Ajustes/ }));
  const engineReady = async () => {
    engine.isReady = true;
    await act(() => services.statusMonitor.refresh());
  };
  return { page: screen.getByRole("main"), engineReady, preferences };
}

describe("Ajustes abiertos mientras el motor arranca", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("(regresión) se recuperan solos cuando el motor responde, sin pulsar «Reintentar»", async () => {
    const aiSettings = vi
      .fn<() => Promise<AiSettingsResult>>()
      .mockRejectedValueOnce(STARTUP_FAILURE)
      .mockResolvedValue(OFF);
    const { page, engineReady, preferences } = await openSettingsWhileStarting({ aiSettings });
    const ai = within(page).getByRole("region", { name: "Inteligencia artificial" });
    expect(await within(ai).findByText("Disponible cuando el motor responda.")).toBeInTheDocument();
    // Mientras arranca no se anuncia un error: se recupera solo.
    expect(within(page).queryByRole("alert")).not.toBeInTheDocument();

    await engineReady();

    expect(
      await within(ai).findByRole("switch", { name: "Explicar cambios con IA" }),
    ).toBeVisible();
    expect(within(page).queryByRole("alert")).not.toBeInTheDocument();
    expect(aiSettings).toHaveBeenCalledTimes(2);
    // Lo que ya había cargado no se vuelve a pedir: no se pierde lo que el usuario cambió ahí.
    expect(preferences).toHaveBeenCalledTimes(1);
  });

  it("si vuelve a fallar con el motor listo, muestra el error real una vez y no insiste", async () => {
    const aiSettings = vi.fn(() => Promise.reject(STARTUP_FAILURE));
    const { page, engineReady } = await openSettingsWhileStarting({ aiSettings });

    await engineReady();

    expect(await within(page).findByText("No pudimos cargar los ajustes.")).toBeVisible();
    await waitFor(() => {
      expect(aiSettings).toHaveBeenCalledTimes(2);
    });
    await act(() => Promise.resolve());
    expect(aiSettings).toHaveBeenCalledTimes(2);
  });
});
