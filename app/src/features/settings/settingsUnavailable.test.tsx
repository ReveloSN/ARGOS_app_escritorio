import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
const DEPENDENT_SECTIONS = ["Detección", "Privacidad", "Inteligencia artificial", "OCR"];

async function openSettings(options: Parameters<typeof fakeEngineServices>[0] = {}) {
  renderApp(fakeEngineServices(options));
  await act(() => Promise.resolve());
  await userEvent.click(screen.getByRole("button", { name: /Ajustes/ }));
  return screen.getByRole("main");
}

function recoverOnRetry<Result>(result: Result) {
  return vi
    .fn<() => Promise<Result>>()
    .mockRejectedValueOnce(new Error("sin respuesta"))
    .mockImplementation(() => Promise.resolve(result));
}

describe("Error único de Ajustes", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("muestra un único error en tres partes antes de las secciones y un solo reintento", async () => {
    const page = await openSettings({
      checkHealth: () => Promise.reject(new Error("sin respuesta")),
    });
    const alert = await within(page).findByRole("alert");
    expect(within(page).getAllByRole("alert")).toHaveLength(1);
    expect(within(alert).getByText("No pudimos cargar los ajustes.")).toBeVisible();
    expect(within(alert).getByText("El motor de análisis no respondió.")).toBeVisible();
    expect(within(alert).getByText(/Reintente en unos segundos/)).toBeVisible();
    expect(within(page).getAllByRole("button", { name: "Reintentar" })).toHaveLength(1);
    const detection = within(page).getByRole("region", { name: "Detección" });
    expect(
      alert.compareDocumentPosition(detection) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("cada sección dependiente muestra la misma línea neutra sin botones", async () => {
    const page = await openSettings();
    await waitFor(() => {
      for (const name of DEPENDENT_SECTIONS) {
        const section = within(page).getByRole("region", { name });
        expect(within(section).getByText("Disponible cuando el motor responda.")).toBeVisible();
        expect(within(section).queryByRole("alert")).not.toBeInTheDocument();
        expect(within(section).queryByRole("button")).not.toBeInTheDocument();
      }
    });
  });

  it("reintentar vuelve a cargar preferencias, IA y OCR y recupera los controles", async () => {
    const preferences = recoverOnRetry(PREFERENCES);
    const aiSettings = recoverOnRetry(OFF);
    const ocrSettings = recoverOnRetry(LOCAL);
    const page = await openSettings({
      preferences: { preferences },
      ai: { aiSettings },
      ocr: { ocrSettings },
    });
    const alert = await within(page).findByRole("alert");
    await userEvent.click(within(alert).getByRole("button", { name: "Reintentar" }));
    await waitFor(() => {
      expect(within(page).queryByRole("alert")).not.toBeInTheDocument();
    });
    for (const load of [preferences, aiSettings, ocrSettings])
      expect(load).toHaveBeenCalledTimes(2);
    expect(within(page).getByRole("radio", { name: "Equilibrada" })).toBeVisible();
    expect(within(page).getByRole("switch", { name: /90 días/ })).toBeVisible();
    expect(within(page).getByRole("switch", { name: "Explicar cambios con IA" })).toBeVisible();
    expect(within(page).getByRole("switch", { name: "Usar Google Document AI" })).toBeVisible();
  });

  it("un fallo parcial se recupera desde el error común sin ocultar ajustes cargados", async () => {
    const aiSettings = recoverOnRetry(OFF);
    const page = await openSettings({
      preferences: { preferences: () => Promise.resolve(PREFERENCES) },
      ai: { aiSettings },
      ocr: { ocrSettings: () => Promise.resolve(LOCAL) },
    });
    const alert = await within(page).findByRole("alert");
    expect(within(page).getByRole("radio", { name: "Equilibrada" })).toBeEnabled();
    expect(within(page).getByRole("switch", { name: "Usar Google Document AI" })).toBeEnabled();
    await userEvent.click(within(alert).getByRole("button", { name: "Reintentar" }));
    expect(
      await within(page).findByRole("switch", { name: "Explicar cambios con IA" }),
    ).toBeVisible();
    expect(within(page).queryByRole("alert")).not.toBeInTheDocument();
  });

  it("mantiene operativos apariencia, asistente y atajos con el motor caído", async () => {
    const page = await openSettings();
    const appearance = within(page).getByRole("region", { name: "Apariencia" });
    const dark = within(appearance).getByRole("radio", { name: "Oscuro" });
    await userEvent.click(dark);
    expect(dark).toHaveAttribute("aria-checked", "true");
    const assistant = within(page).getByRole("region", { name: "Asistente" });
    const toggle = within(assistant).getByRole("switch", { name: "Mostrar asistente" });
    const wasChecked = toggle.getAttribute("aria-checked");
    await userEvent.click(toggle);
    expect(toggle.getAttribute("aria-checked")).not.toBe(wasChecked);
    expect(within(page).getByRole("region", { name: "Atajos de teclado" })).toBeVisible();
  });
});
