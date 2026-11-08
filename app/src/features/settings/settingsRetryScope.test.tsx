import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AiSettingsResult } from "../../services/engine/aiTypes";
import type { OcrSettingsResult } from "../../services/engine/ocrTypes";
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
const CLOUD: OcrSettingsResult = {
  isLocalAvailable: true,
  usesCloud: true,
  projectId: "",
  location: "",
  processorId: "",
  hasCredentials: false,
  isKeychainAvailable: true,
  isCloudReady: false,
};

// Lo que ya cargó no se vuelve a pedir: si se recargara, se perdería lo que el usuario escribió.
describe("«Reintentar» de Ajustes", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("(regresión) solo vuelve a pedir las secciones que fallaron y conserva lo escrito", async () => {
    const aiSettings = vi
      .fn<() => Promise<AiSettingsResult>>()
      .mockRejectedValueOnce(new Error("sin respuesta"))
      .mockResolvedValue(OFF);
    const ocrSettings = vi.fn(() => Promise.resolve(CLOUD));
    renderApp(fakeEngineServices({ ai: { aiSettings }, ocr: { ocrSettings } }));
    await act(() => Promise.resolve());
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Ajustes/ }));
    await user.type(await screen.findByLabelText("Proyecto de Google Cloud"), "mi-proyecto");

    const error = (await screen.findByText("No pudimos cargar los ajustes.")).closest(
      '[role="alert"]',
    );
    await user.click(within(error as HTMLElement).getByRole("button", { name: "Reintentar" }));
    await screen.findByRole("switch", { name: "Explicar cambios con IA" });

    expect(ocrSettings).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Proyecto de Google Cloud")).toHaveValue("mi-proyecto");
  });
});
