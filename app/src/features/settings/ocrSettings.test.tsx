import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EngineRejectedError } from "../../services/engine/engineHttp";
import type { OcrSettingsResult } from "../../services/engine/ocrTypes";
import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";

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
const CLOUD: OcrSettingsResult = { ...LOCAL, usesCloud: true };

async function openSettings(ocr: Parameters<typeof fakeEngineServices>[0]) {
  renderApp(fakeEngineServices(ocr));
  await act(() => Promise.resolve());
  await userEvent.click(screen.getByRole("button", { name: /Ajustes/ }));
}

describe("Ajustes > OCR", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("dice que el OCR local está listo y Document AI viene apagado", async () => {
    const setUsesCloud = vi.fn(() => Promise.resolve(CLOUD));
    await openSettings({ ocr: { ocrSettings: () => Promise.resolve(LOCAL), setUsesCloud } });

    expect(await screen.findByText(/El OCR local \(Tesseract\) está listo/)).toBeInTheDocument();
    const toggle = screen.getByRole("switch", { name: "Usar Google Document AI" });
    expect(toggle).not.toBeChecked();
    expect(screen.queryByLabelText("Procesador OCR")).not.toBeInTheDocument();

    await userEvent.click(toggle);
    expect(setUsesCloud).toHaveBeenCalledWith(true);
    expect(await screen.findByLabelText("Procesador OCR")).toBeInTheDocument();
  });

  it("guarda el procesador y la clave JSON, y explica una clave que no sirve", async () => {
    const setProcessor = vi.fn(() => Promise.resolve(CLOUD));
    const storeCredentials = vi
      .fn()
      .mockRejectedValueOnce(new EngineRejectedError("/settings/ocr", "invalid_credentials"))
      .mockResolvedValueOnce({ ...CLOUD, hasCredentials: true });
    await openSettings({
      ocr: { ocrSettings: () => Promise.resolve(CLOUD), setProcessor, storeCredentials },
    });

    await userEvent.type(await screen.findByLabelText("Proyecto de Google Cloud"), "proyecto");
    await userEvent.selectOptions(screen.getByLabelText("Ubicación"), "eu");
    await userEvent.type(screen.getByLabelText("Procesador OCR"), "a1b2c3");
    await userEvent.click(screen.getByRole("button", { name: "Guardar procesador" }));
    expect(setProcessor).toHaveBeenCalledWith({
      projectId: "proyecto",
      location: "eu",
      processorId: "a1b2c3",
    });

    const field = screen.getByLabelText("Clave JSON de la cuenta de servicio");
    await userEvent.click(field);
    await userEvent.paste("{}");
    await userEvent.click(screen.getByRole("button", { name: "Guardar clave" }));
    expect(await screen.findByText(/No es la clave de una cuenta de servicio/)).toBeInTheDocument();

    await userEvent.click(field);
    await userEvent.paste('{"type": "service_account"}');
    await userEvent.click(screen.getByRole("button", { name: "Guardar clave" }));
    expect(
      await screen.findByText("Clave guardada en el llavero del sistema."),
    ).toBeInTheDocument();
  });

  it("sin Tesseract explica qué pasó, por qué y qué hacer", async () => {
    const missing = { ...LOCAL, isLocalAvailable: false };
    await openSettings({ ocr: { ocrSettings: () => Promise.resolve(missing) } });

    expect(await screen.findByText("El OCR local no está disponible.")).toBeInTheDocument();
    expect(screen.getByText(/No se encontró Tesseract/)).toBeInTheDocument();
    expect(screen.getByText("Reinstale ARGUS y vuelva a intentarlo.")).toBeInTheDocument();
  });
});
