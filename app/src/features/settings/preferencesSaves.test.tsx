import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AiSettingsResult } from "../../services/engine/aiTypes";
import type { OcrSettingsResult } from "../../services/engine/ocrTypes";
import type { PreferencesResult } from "../../services/engine/preferencesTypes";
import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";

const PREFERENCES: PreferencesResult = {
  sensitivity: "balanced",
  comparedCategories: ["amounts", "dates", "identifiers", "names", "periods"],
  hasRetentionLimit: true,
  historyFolder: "C:/Usuarios/equipo/ARGUS",
  suppressionRules: [],
};

// IA y OCR cargan bien: así el único error en pantalla es el del guardado.
const LOADED_SECTIONS = {
  ai: {
    aiSettings: (): Promise<AiSettingsResult> =>
      Promise.resolve({
        explainsChanges: false,
        provider: "anthropic",
        model: "claude-sonnet-5-5",
        hasKey: false,
        isKeychainAvailable: true,
        providers: [{ id: "anthropic", model: "claude-sonnet-5-5" }],
      }),
  },
  ocr: {
    ocrSettings: (): Promise<OcrSettingsResult> =>
      Promise.resolve({
        isLocalAvailable: true,
        usesCloud: false,
        projectId: "",
        location: "",
        processorId: "",
        hasCredentials: false,
        isKeychainAvailable: true,
        isCloudReady: false,
      }),
  },
};

async function openSettings() {
  await act(() => Promise.resolve());
  await userEvent.click(screen.getByRole("button", { name: /Ajustes/ }));
}

describe("guardar ajustes de detección", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("(regresión) un segundo cambio antes de la respuesta no deshace el primero", async () => {
    const savePreferences = vi.fn(() => new Promise<PreferencesResult>(() => undefined));
    renderApp(
      fakeEngineServices({
        preferences: { preferences: () => Promise.resolve(PREFERENCES), savePreferences },
      }),
    );
    await openSettings();

    await userEvent.click(await screen.findByRole("radio", { name: "Estricta" }));
    const types = screen.getByRole("group", { name: "Tipos que se comparan" });
    await userEvent.click(within(types).getByRole("checkbox", { name: "Nombres" }));

    expect(savePreferences).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sensitivity: "strict",
        comparedCategories: ["amounts", "dates", "identifiers", "periods"],
      }),
    );
  });

  it("si un guardado falla, «Reintentar» vuelve a leer los ajustes vigentes", async () => {
    const preferences = vi.fn(() => Promise.resolve(PREFERENCES));
    const savePreferences = vi.fn(() => Promise.reject(new Error("sin respuesta")));
    renderApp(
      fakeEngineServices({ ...LOADED_SECTIONS, preferences: { preferences, savePreferences } }),
    );
    await openSettings();

    await userEvent.click(await screen.findByRole("radio", { name: "Estricta" }));
    const error = (await screen.findByText("No se guardó el cambio.")).closest('[role="alert"]');
    await userEvent.click(within(error as HTMLElement).getByRole("button", { name: "Reintentar" }));

    expect(preferences).toHaveBeenCalledTimes(2);
  });
});
